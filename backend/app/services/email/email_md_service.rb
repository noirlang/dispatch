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

    lines = text.to_s.split("\n")
    processed_lines = []
    in_code_block = false

    lines.each do |line|
      if line.start_with?("```")
        in_code_block = !in_code_block
        processed_lines << line
      elsif in_code_block || line.start_with?("#") || line.start_with?(">") || line.start_with?("- ") || line.start_with?("* ") || line.match?(/^\d+\.\s/) || line.blank? || line.start_with?("<")
        processed_lines << line
      else
        processed_lines << "#{line}  "
      end
    end

    html = Kramdown::Document.new(processed_lines.join("\n")).to_html

    # Strip dangerous script tags, svg exploits, and inline event handlers
    doc = Nokogiri::HTML.fragment(html.to_s)
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
