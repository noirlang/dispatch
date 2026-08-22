class Email::SendService
  Result = Struct.new(:success?, :email, :error)

  def self.call(user, params)
    mail = Mail.new do
      from    user.email
      to      params[:to]
      cc      params[:cc]
      subject params[:subject]
      body    params[:body]
    end
    mail.delivery_method :smtp, {
      address: ENV.fetch("MAIL_HOST", "localhost"),
      port: 587,
      user_name: user.email,
      password: ENV["MAIL_PASSWORD"],
      authentication: :plain,
      enable_starttls_auto: true
    }
    mail.deliver!

    email = user.emails.create!(
      from_address: user.email,
      to_address: params[:to],
      cc: params[:cc],
      subject: params[:subject],
      body_text: params[:body],
      folder: "sent",
      is_read: true
    )
    Result.new(true, email, nil)
  rescue => e
    Result.new(false, nil, e.message)
  end
end
