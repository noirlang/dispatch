class Email::EmailMdService
  def self.to_html(raw_markdown)
    return "" if raw_markdown.blank?

    cleaned_body = render_markdown(raw_markdown)

    <<~HTML
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; margin: 0; padding: 0;">
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6;">
          #{cleaned_body}
        </div>
      </body>
      </html>
    HTML
  end

  def self.render_markdown(text)
    require "kramdown"

    # Convert markdown using GitHub Flavored Markdown and hard wraps
    html = Kramdown::Document.new(
      text.to_s,
      input: "GFM",
      hard_wrap: true,
      smart_quotes: %w[lsquo rsquo ldquo rdquo]
    ).to_html

    # Style blockquotes and links cleanly for email clients
    doc = Nokogiri::HTML.fragment(html.to_s)
    doc.css("blockquote").each do |bq|
      bq["style"] = "border-left: 2px solid #52525b; margin: 12px 0; padding: 4px 0 4px 12px; color: #a1a1aa; font-style: normal;"
    end
    doc.css("a").each do |a|
      a["style"] = "color: #3b82f6; text-decoration: underline;"
    end
    doc.css("pre, code").each do |c|
      c["style"] = "background-color: #18181b; color: #f4f4f5; padding: 2px 6px; border-radius: 4px; font-family: monospace;"
    end

    # Strip dangerous script tags, svg exploits, and inline event handlers
    doc.xpath('.//script|.//object|.//embed|.//applet|.//form|.//iframe').remove
    doc.traverse do |node|
      if node.is_a?(Nokogiri::XML::Element)
        node.attributes.each do |name, _|
          node.remove_attribute(name) if name.downcase.start_with?("on")
        end
      end
    end
    doc.to_html
  rescue => e
    escaped = ERB::Util.html_escape(text)
    escaped.gsub!(/\*\*(.+?)\*\*/, '<strong>\1</strong>')
    escaped.gsub!(/\*(.+?)\*/, '<em>\1</em>')
    escaped.gsub!(/\[(.+?)\]\((.+?)\)/, '<a href="\2">\1</a>')
    escaped.gsub!(/\n/, '<br>')
    "<p>#{escaped}</p>"
  end
end
