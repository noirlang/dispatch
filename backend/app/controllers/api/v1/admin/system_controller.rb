class Api::V1::Admin::SystemController < Api::V1::Admin::BaseController
  def status
    users_count = User.count
    emails_count = Email.count
    groups_count = ContactGroup.count
    feeds_count = RssFeed.count
    events_count = CalendarEvent.count
    invites_count = InviteCode.where(is_active: true).count

    # Check Redis
    redis_ok = begin
      Sidekiq.redis { |r| r.ping } == "PONG"
    rescue
      false
    end

    # Check Database
    db_ok = begin
      ActiveRecord::Base.connection.active?
    rescue
      false
    end

    render json: {
      domain: ENV.fetch("MAIL_DOMAIN", "dispatch.local"),
      mail_host: ENV.fetch("MAIL_HOST", "mailserver"),
      environment: Rails.env,
      registration_mode: SystemConfig.get("registration_mode", "public"),
      database_status: db_ok ? "connected" : "error",
      redis_status: redis_ok ? "connected" : "error",
      stats: {
        users_count: users_count,
        emails_count: emails_count,
        groups_count: groups_count,
        feeds_count: feeds_count,
        events_count: events_count,
        invites_count: invites_count
      },
      system_time: Time.current
    }
  end

  def settings
    render json: {
      registration_mode: SystemConfig.get("registration_mode", "public")
    }
  end

  def update_settings
    mode = params[:registration_mode].to_s
    if %w[public admin_only invite_only].include?(mode)
      SystemConfig.set("registration_mode", mode)
      render json: { message: "Kayıt erişim modu güncellendi: #{mode}", registration_mode: mode }
    else
      render json: { error: "Geçersiz kayıt modu!" }, status: :unprocessable_entity
    end
  end

  def users
    users = User.order(created_at: :desc).map do |u|
      {
        id: u.id,
        name: u.name,
        email: u.email,
        created_at: u.created_at,
        emails_count: u.emails.count,
        ai_provider: u.ai_provider,
        has_ai: u.ai_configured?
      }
    end
    render json: users
  end

  def create_user
    user = User.new(
      name: params[:name],
      email: params[:email]&.downcase&.strip,
      password: params[:password],
      password_confirmation: params[:password_confirmation].presence || params[:password]
    )

    if user.save
      render json: { message: "Kullanıcı hesabı oluşturuldu.", user: { id: user.id, name: user.name, email: user.email } }, status: :created
    else
      render json: { error: user.errors.full_messages.join(", ") }, status: :unprocessable_entity
    end
  end

  def change_password
    current_pw = params[:current_password].to_s
    new_pw = params[:new_password].to_s

    unless SystemConfig.admin_password_valid?(current_pw)
      return render json: { error: "Mevcut yönetici şifresi hatalı!" }, status: :unprocessable_entity
    end

    if new_pw.length < 6
      return render json: { error: "Yeni şifre en az 6 karakter olmalıdır!" }, status: :unprocessable_entity
    end

    SystemConfig.set_admin_password(new_pw)
    render json: { message: "Yönetici şifresi başarıyla güncellendi." }
  end

  def sync_user_password
    user = User.find_by(id: params[:user_id])
    return render json: { error: "Kullanıcı bulunamadı!" }, status: :not_found unless user

    new_pw = params[:new_password].to_s
    if new_pw.length < 6
      return render json: { error: "Yeni şifre en az 6 karakter olmalıdır!" }, status: :unprocessable_entity
    end

    user.password = new_pw
    user.password_confirmation = new_pw

    if user.save
      # Force Dovecot sync with raw password
      Email::MailboxProvisioner.sync_account(user, new_pw)
      render json: { message: "#{user.email} şifresi başarıyla güncellendi ve posta kutusuna eşitlendi." }
    else
      render json: { error: user.errors.full_messages.join(", ") }, status: :unprocessable_entity
    end
  end
end
