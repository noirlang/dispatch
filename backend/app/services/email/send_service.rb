require "kramdown"

class Email::SendService
  Result = Struct.new(:success?, :email, :error)

  def self.call(user, params)
    raw_body = params[:body].to_s
    html_body = Kramdown::Document.new(raw_body).to_html

    # Clean, email-safe HTML template
    styled_html = <<~HTML
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; }
          a { color: #2563eb; text-decoration: underline; }
          blockquote { border-left: 3px solid #cbd5e1; margin: 12px 0; padding-left: 12px; color: #475569; }
          code { font-family: monospace; background-color: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-size: 12px; }
          pre { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; overflow-x: auto; }
          ul, ol { padding-left: 20px; }
          strong { font-weight: 700; color: #0f172a; }
        </style>
      </head>
      <body>
        #{html_body}
      </body>
      </html>
    HTML

    mail = Mail.new do
      from    user.email
      to      params[:to]
      cc      params[:cc] if params[:cc].present?
      subject params[:subject]

      text_part do
        content_type 'text/plain; charset=UTF-8'
        body raw_body
      end

      html_part do
        content_type 'text/html; charset=UTF-8'
        body styled_html
      end
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
      body_text: raw_body,
      body_html: styled_html,
      folder: "sent",
      is_read: true
    )
    Result.new(true, email, nil)
  rescue => e
    Result.new(false, nil, e.message)
  end
end
