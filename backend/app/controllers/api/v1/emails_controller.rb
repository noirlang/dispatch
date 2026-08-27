class Api::V1::EmailsController < Api::V1::BaseController
  before_action :set_email, only: [:show, :destroy, :reply, :forward, :approve, :reject, :block_sender, :toggle_flag, :toggle_important_sender, :ai_summary, :ai_reply, :ai_translate]

  def index
    # Sync with Thunderbird / Dovecot Maildir state
    Email::MaildirSyncService.sync_user(current_user)

    # M4 Fix: Whitelist folder parameter — never pass raw user input to WHERE clause
    allowed_folders = Email::FOLDERS
    folder = allowed_folders.include?(params[:folder]) ? params[:folder] : "inbox"
    emails = current_user.emails.where(folder: folder).order(created_at: :desc)
    render json: emails.map { |e| email_list_json(e) }
  end

  def show
    @email.update!(is_read: true)
    render json: email_json(@email)
  end

  def create
    result = Email::SendService.call(current_user, email_params)
    if result.success?
      render json: email_json(result.email), status: :created
    else
      render json: { error: result.error }, status: :unprocessable_entity
    end
  end

  def save_draft
    draft = if params[:id].present?
              current_user.emails.where(folder: "drafts").find_by(id: params[:id])
            end
    draft ||= current_user.emails.new(folder: "drafts", from_address: current_user.email)
    
    draft.assign_attributes(
      to_address: params[:to_address] || params[:to] || "",
      cc: params[:cc],
      bcc: params[:bcc],
      subject: params[:subject] || "(Başlıksız Taslak)",
      body_text: params[:body_text] || params[:body] || "",
      body_html: params[:body_html] || (params[:body_text] || params[:body] ? "<p>#{CGI.escapeHTML(params[:body_text] || params[:body])}</p>" : nil),
      attachments: params[:attachments] || []
    )
    draft.save!
    render json: email_json(draft), status: :ok
  end

  def destroy
    @email.update!(folder: "trash")
    Email::MaildirSyncService.on_email_moved_or_deleted(@email, "trash")
    render json: { message: "Moved to trash" }
  end

  def toggle_flag
    @email.update!(is_flagged: !@email.is_flagged)
    render json: { is_flagged: @email.is_flagged }
  end

  def toggle_important_sender
    clean_from = @email.from_address.downcase.strip
    rule = current_user.sender_rules.find_or_initialize_by(email_address: clean_from)
    new_status = (rule.status == "important") ? "approved" : "important"
    rule.status = new_status
    rule.approved_at ||= Time.current
    rule.save!
    render json: { is_important: new_status == "important", sender_status: new_status }
  end

  def contacts
    sent_addrs = current_user.emails.where(folder: "sent").order(created_at: :desc).pluck(:to_address).flat_map { |a| a.to_s.split(",") }.map { |a| a.to_s.downcase.strip }.reject { |a| a.blank? || a.start_with?("@") }
    inbox_addrs = current_user.emails.pluck(:from_address).map { |a| a.to_s.downcase.strip }.reject(&:blank?)
    rule_addrs = current_user.sender_rules.pluck(:email_address).map { |a| a.to_s.downcase.strip }.reject(&:blank?)
    all_addrs = (sent_addrs + inbox_addrs + rule_addrs).uniq

    list = all_addrs.map do |addr|
      profile = Email::SenderAvatarService.for(addr)
      rule = current_user.sender_rules.find_by(email_address: addr)
      
      recent_emails = current_user.emails
                                  .where("lower(from_address) = ? OR lower(to_address) LIKE ?", addr, "%#{addr}%")
                                  .order(created_at: :desc)
                                  .limit(10)
                                  .map do |e|
        {
          id: e.id,
          subject: e.subject,
          snippet: e.body_text.to_s.truncate(80),
          from: e.from_address,
          to: e.to_address,
          folder: e.folder,
          created_at: e.created_at
        }
      end

      {
        email: addr,
        name: profile[:name].presence || addr.split("@").first.capitalize,
        avatar_url: profile[:avatar_url],
        initials: profile[:initials],
        status: rule&.status || "approved",
        is_important: rule&.status == "important",
        is_blocked: rule&.status == "blocked",
        emails_count: recent_emails.size,
        last_contact_at: recent_emails.first&.dig(:created_at),
        recent_emails: recent_emails
      }
    end

    list.sort_by! { |c| [c[:is_important] ? 0 : 1, c[:last_contact_at] ? -Time.zone.parse(c[:last_contact_at].to_s).to_i : 0] }
    render json: list
  end

  def reply
    result = Email::SendService.call(current_user, reply_params(@email))
    if !result.success?
      return render json: { error: result.error || "Yanıt gönderilemedi" }, status: :unprocessable_entity
    end

    if @email.folder == "approvals"
      clean_from = @email.from_address.to_s.gsub(/.*<([^>]+)>.*/, '\1').strip.downcase
      SenderRule.find_or_create_by(user: current_user, email_address: clean_from) do |r|
        r.status = "approved"
        r.approved_at = Time.current
      end
    end
    render json: email_json(result.email), status: :created
  end

  def forward
    result = Email::SendService.call(current_user, forward_params(@email))
    if !result.success?
      return render json: { error: result.error || "İleti yönlendirilemedi" }, status: :unprocessable_entity
    end
    render json: email_json(result.email), status: :created
  end


  def approve
    clean_from = @email.from_address.to_s.gsub(/.*<([^>]+)>.*/, '\1').strip.downcase
    rule = current_user.sender_rules.find_or_initialize_by(email_address: clean_from)
    rule.update!(status: "approved", approved_at: Time.current)

    # Move all pending approval emails from this sender to inbox in DB and Maildir
    current_user.emails.where(folder: "approvals").where("LOWER(from_address) LIKE ?", "%#{clean_from}%").find_each do |em|
      em.update!(folder: "inbox")
      Email::MaildirSyncService.on_email_moved_or_deleted(em, "inbox")
    end

    @email.update!(folder: "inbox")
    Email::MaildirSyncService.on_email_moved_or_deleted(@email, "inbox")
    render json: { message: "Sender approved and moved to inbox" }
  end

  def reject
    clean_from = @email.from_address.to_s.gsub(/.*<([^>]+)>.*/, '\1').strip.downcase
    rule = current_user.sender_rules.find_or_initialize_by(email_address: clean_from)
    rule.update!(status: "blocked")
    @email.update!(folder: "trash")
    Email::MaildirSyncService.on_email_moved_or_deleted(@email, "trash")
    render json: { message: "Sender blocked and moved to trash" }
  end

  def block_sender
    rule = SenderRule.find_or_initialize_by(user: current_user, email_address: @email.from_address)
    rule.update!(status: "blocked")
    # Move all messages from this sender to trash
    current_user.emails.where(from_address: @email.from_address).update_all(folder: "trash")
    render json: { message: "Sender blocked and moved to trash" }
  end

  def ai_summary
    return render json: { error: "AI not configured" }, status: :bad_request unless current_user.ai_configured?

    res = Ai::AnalyzeService.summarize(current_user, @email)
    if res.success?
      render json: { summary: res.data }
    else
      render json: { error: res.error }, status: :unprocessable_entity
    end
  end

  def ai_reply
    return render json: { error: "AI not configured" }, status: :bad_request unless current_user.ai_configured?

    # M7 Fix: Limit instructions length to prevent API token DoS
    instructions = params[:instructions].to_s.first(500)
    allowed_tones = %w[friendly formal casual professional empathetic concise]
    tone = allowed_tones.include?(params[:tone]) ? params[:tone] : "friendly"
    res = Ai::AnalyzeService.generate_reply(current_user, @email, instructions, tone)


    if res.success?
      render json: {
        reply_body: res.data,
        subject: @email.subject.start_with?("Re:") ? @email.subject : "Re: #{@email.subject}",
        to: @email.from_address
      }
    else
      render json: { error: res.error }, status: :unprocessable_entity
    end
  end

  def ai_translate
    return render json: { error: "AI not configured" }, status: :bad_request unless current_user.ai_configured?

    target_language = params[:target_language].presence || "tr"
    res = Ai::AnalyzeService.translate(current_user, @email, target_language)

    if res.success?
      render json: res.data
    else
      render json: { error: res.error }, status: :unprocessable_entity
    end
  end

  def merge_threads
    thread_ids = params[:thread_ids]
    return render json: { error: "Need at least 2 threads" }, status: :bad_request if thread_ids.size < 2

    primary = current_user.email_threads.find(thread_ids.first)
    EmailThread.where(id: thread_ids[1..], user: current_user).update_all(merged_into_id: primary.id)
    render json: { message: "Threads merged", primary_thread_id: primary.id }
  end

  def bulk_action
    ids = Array(params[:ids]).map(&:to_i).reject(&:zero?)
    action_type = params[:action_type].to_s.strip

    return render json: { error: "Hiçbir e-posta seçilmedi." }, status: :bad_request if ids.empty?

    emails = current_user.emails.where(id: ids)
    count = emails.count

    case action_type
    when "mark_read"
      emails.update_all(is_read: true)
      render json: { message: "#{count} e-posta okundu olarak işaretlendi.", count: count }
    when "mark_unread"
      emails.update_all(is_read: false)
      render json: { message: "#{count} e-posta okunmadı olarak işaretlendi.", count: count }
    when "move_inbox"
      emails.find_each do |em|
        em.update!(folder: "inbox")
        Email::MaildirSyncService.on_email_moved_or_deleted(em, "inbox")
      end
      render json: { message: "#{count} e-posta Gelen Kutusuna taşındı.", count: count }
    when "move_trash", "delete"
      emails.find_each do |em|
        if em.folder == "trash"
          Email::MaildirSyncService.on_email_moved_or_deleted(em, "trash")
          em.destroy
        else
          em.update!(folder: "trash")
          Email::MaildirSyncService.on_email_moved_or_deleted(em, "trash")
        end
      end
      render json: { message: "#{count} e-posta silindi / Çöp Kutusuna taşındı.", count: count }
    when "toggle_flag"
      has_unflagged = emails.where(is_flagged: [false, nil]).exists?
      emails.update_all(is_flagged: has_unflagged)
      render json: { message: "#{count} e-postanın bayrak durumu güncellendi.", is_flagged: has_unflagged, count: count }
    else
      render json: { error: "Geçersiz toplu işlem türü." }, status: :unprocessable_entity
    end
  end

  private

  def set_email
    @email = current_user.emails.find(params[:id])
  end

  def email_params
    base = params.permit(:to, :cc, :bcc, :subject, :body)
    base[:attachments] = params[:attachments] if params[:attachments].present?
    base
  end

  def reply_params(original)
    clean_from = original.from_address.to_s.gsub(/.*<([^>]+)>.*/, '\1').strip
    base = { to: clean_from, subject: original.subject.to_s.start_with?("Re:") ? original.subject : "Re: #{original.subject}", body: params[:body] }
    base[:attachments] = params[:attachments] if params[:attachments].present?
    base
  end

  def forward_params(original)
    base = { to: params[:to], subject: "Fwd: #{original.subject}", body: "#{params[:body]}\n\n---\n#{original.body_text}" }
    base[:attachments] = params[:attachments].presence || original.attachments
    base
  end

  def email_json(email)
    raw_html = email.body_html.presence
    if raw_html.blank? && email.body_text.present? && email.body_text.include?("<") && (email.body_text.include?("<!DOCTYPE") || email.body_text.include?("<html") || email.body_text.include?("<div") || email.body_text.include?("<p"))
      raw_html = email.body_text
    end

    safe_html = if raw_html.present? && current_user.spy_pixel_blocking
                  Email::ImageProxyService.rewrite_html(raw_html)
                else
                  raw_html
                end
    profile = Email::SenderAvatarService.for(email.from_address)
    first_recipient = email.to_address.to_s.split(/[,;]/).first.to_s.strip
    recipient_profile = Email::SenderAvatarService.for(first_recipient)
    rule = current_user.sender_rules.find_by(email_address: email.from_address.downcase.strip)

    plain_body = clean_plain_text(email)

    {
      id: email.id,
      from: email.from_address,
      to: email.to_address,
      subject: email.subject,
      body: plain_body,
      body_text: plain_body,
      body_html: safe_html,
      folder: email.folder,
      is_read: email.is_read,
      is_flagged: email.is_flagged || false,
      is_important_sender: rule&.status == "important",
      created_at: email.created_at,
      attachments: email.attachments || [],
      has_attachments: (email.attachments.present? && !email.attachments.empty?),
      sender_name: profile[:name],
      avatar_url: profile[:avatar_url],
      avatar_initials: profile[:initials],
      is_known_company: profile[:is_known_company],
      is_dispatch_user: profile[:is_dispatch_user] || false,
      recipient_name: recipient_profile[:name],
      recipient_avatar_url: recipient_profile[:avatar_url],
      recipient_initials: recipient_profile[:initials],
      is_recipient_dispatch_user: recipient_profile[:is_dispatch_user] || false
    }
  end

  def clean_plain_text(email)
    raw = email.body_text.presence || email.body_html.presence
    return "" if raw.blank?

    if raw.include?("<") && (raw.include?("</") || raw.include?("/>") || raw.include?("<!DOCTYPE") || raw.include?("<html") || raw.include?("<div") || raw.include?("<p"))
      begin
        doc = Nokogiri::HTML(raw)
        doc.xpath('//style|//script|//head|//meta|//title|//link').remove
        text = doc.text.gsub(/\r\n?/, "\n").gsub(/[ \t]+/, " ").strip
        return text if text.present?
      rescue
      end
    end

    raw.to_s.strip
  end


  def email_list_json(email)
    raw_html = email.body_html.presence
    if raw_html.blank? && email.body_text.present? && email.body_text.include?("<") && (email.body_text.include?("<!DOCTYPE") || email.body_text.include?("<html") || email.body_text.include?("<div") || email.body_text.include?("<p"))
      raw_html = email.body_text
    end

    profile = Email::SenderAvatarService.for(email.from_address)
    rule = current_user.sender_rules.find_by(email_address: email.from_address.downcase.strip)
    plain_body = clean_plain_text(email)

    {
      id:           email.id,
      from:         email.from_address,
      to:           email.to_address,
      subject:      email.subject,
      body:         plain_body,
      body_text:    plain_body,
      body_html:    raw_html,
      snippet:      plain_body.present? ? plain_body.truncate(160) : (email.subject.presence || "İletiyi görüntülemek için dokunun"),
      is_read:      email.is_read,
      is_flagged:   email.is_flagged || false,
      is_important_sender: rule&.status == "important",
      folder:       email.folder,
      created_at:   email.created_at,
      has_attachments: (email.attachments.present? && !email.attachments.empty?),
      attachments_count: (email.attachments&.size || 0),
      sender_name:  profile[:name],
      avatar_url:   profile[:avatar_url],
      avatar_initials: profile[:initials],
      is_known_company: profile[:is_known_company],
      is_dispatch_user: profile[:is_dispatch_user] || false
    }
  end
end

