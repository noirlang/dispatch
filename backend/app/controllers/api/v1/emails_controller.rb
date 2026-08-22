class Api::V1::EmailsController < Api::V1::BaseController
  before_action :set_email, only: [:show, :destroy, :reply, :forward, :approve, :reject, :block_sender, :toggle_flag, :toggle_important_sender, :ai_summary, :ai_reply, :ai_translate]

  def index
    folder = params[:folder] || "inbox"
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
      render json: result.email, status: :created
    else
      render json: { error: result.error }, status: :unprocessable_entity
    end
  end

  def destroy
    @email.update!(folder: "trash")
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
    if @email.folder == "approvals"
      SenderRule.find_or_create_by(user: current_user, email_address: @email.from_address) do |r|
        r.status = "approved"
        r.approved_at = Time.current
      end
    end
    render json: result.email, status: :created
  end

  def forward
    result = Email::SendService.call(current_user, forward_params(@email))
    render json: result.email, status: :created
  end

  def approve
    rule = SenderRule.find_or_initialize_by(user: current_user, email_address: @email.from_address)
    rule.update!(status: "approved", approved_at: Time.current)
    @email.update!(folder: "inbox")
    render json: { message: "Sender approved" }
  end

  def reject
    SenderRule.find_or_create_by(user: current_user, email_address: @email.from_address) do |r|
      r.status = "blocked"
    end
    @email.update!(folder: "trash")
    render json: { message: "Sender blocked" }
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

    instructions = params[:instructions].to_s
    tone = params[:tone].presence || "friendly"
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

  private

  def set_email
    @email = current_user.emails.find(params[:id])
  end

  def email_params
    params.permit(:to, :cc, :subject, :body)
  end

  def reply_params(original)
    { to: original.from_address, subject: "Re: #{original.subject}", body: params[:body] }
  end

  def forward_params(original)
    { to: params[:to], subject: "Fwd: #{original.subject}", body: "#{params[:body]}\n\n---\n#{original.body_text}" }
  end

  def email_json(email)
    raw_html = email.body_html.presence
    safe_html = if raw_html.present? && current_user.spy_pixel_blocking
                  Email::ImageProxyService.rewrite_html(raw_html)
                else
                  raw_html
                end
    profile = Email::SenderAvatarService.for(email.from_address)
    rule = current_user.sender_rules.find_by(email_address: email.from_address.downcase.strip)

    {
      id: email.id,
      from: email.from_address,
      to: email.to_address,
      subject: email.subject,
      body: email.body_text.presence || ActionController::Base.helpers.strip_tags(email.body_html.to_s),
      body_text: email.body_text.presence || ActionController::Base.helpers.strip_tags(email.body_html.to_s),
      body_html: safe_html,
      folder: email.folder,
      is_read: email.is_read,
      is_flagged: email.is_flagged || false,
      is_important_sender: rule&.status == "important",
      created_at: email.created_at,
      sender_name: profile[:name],
      avatar_url: profile[:avatar_url],
      avatar_initials: profile[:initials],
      is_known_company: profile[:is_known_company],
      is_dispatch_user: profile[:is_dispatch_user] || false
    }
  end

  def email_list_json(email)
    profile = Email::SenderAvatarService.for(email.from_address)
    rule = current_user.sender_rules.find_by(email_address: email.from_address.downcase.strip)

    {
      id:           email.id,
      from:         email.from_address,
      subject:      email.subject,
      is_read:      email.is_read,
      is_flagged:   email.is_flagged || false,
      is_important_sender: rule&.status == "important",
      folder:       email.folder,
      created_at:   email.created_at,
      sender_name:  profile[:name],
      avatar_url:   profile[:avatar_url],
      avatar_initials: profile[:initials],
      is_known_company: profile[:is_known_company],
      is_dispatch_user: profile[:is_dispatch_user] || false
    }
  end
end
