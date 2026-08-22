class Api::V1::EmailsController < Api::V1::BaseController
  before_action :set_email, only: [:show, :destroy, :reply, :forward, :approve, :reject]

  def index
    folder = params[:folder] || "inbox"
    emails = current_user.emails.where(folder: folder).order(created_at: :desc)
    render json: emails
  end

  def show
    @email.update!(is_read: true)
    render json: email_json(@email)
  end

  def create
    # Send via SMTP
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

  def reply
    result = Email::SendService.call(current_user, reply_params(@email))
    # Auto-approve sender if replying from approvals
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
    body = email.body_html.presence || email.body_text
    body = Email::ImageProxyService.rewrite_html(body) if email.body_html.present? && current_user.spy_pixel_blocking
    {
      id: email.id,
      from: email.from_address,
      to: email.to_address,
      subject: email.subject,
      body: body,
      folder: email.folder,
      is_read: email.is_read,
      created_at: email.created_at
    }
  end
end

# Override index to include sender avatars
alias_method :original_index, :index
def index
  folder = params[:folder] || "inbox"
  emails = current_user.emails.where(folder: folder).order(created_at: :desc)
  render json: emails.map { |e| email_list_json(e) }
end

private

def email_list_json(email)
  profile = Email::SenderAvatarService.for(email.from_address)
  {
    id:           email.id,
    from:         email.from_address,
    subject:      email.subject,
    is_read:      email.is_read,
    folder:       email.folder,
    created_at:   email.created_at,
    sender_name:  profile[:name],
    avatar_url:   profile[:avatar_url],
    avatar_initials: profile[:initials],
    is_known_company: profile[:is_known_company]
  }
end
