class Email::EmailMdService
  def self.to_html(raw_markdown)
    return "" if raw_markdown.blank?

    html = begin
      # 1. Try official EmailMD engine via Node renderer
      script_path = Rails.root.join("bin/emailmd_renderer.js")
      if File.exist?(script_path)
        require "open3"
        stdout, stderr, status = Open3.capture3("node", script_path.to_s, stdin_data: raw_markdown.to_s)
        if status.success? && stdout.strip.present?
          stdout
        else
          render_markdown(raw_markdown)
        end
      else
        render_markdown(raw_markdown)
      end
    rescue
      render_markdown(raw_markdown)
    end

    # Strip dangerous script tags, svg exploits, and inline event handlers while preserving <style>
    doc = Nokogiri::HTML.fragment(html.to_s)
    doc.xpath('.//script|.//object|.//embed|.//applet|.//form|.//iframe').remove
    doc.traverse do |node|
      if node.is_a?(Nokogiri::XML::Element)
        node.attributes.each do |name, _|
          node.remove_attribute(name) if name.downcase.start_with?("on")
        end
      end
    end
    cleaned_body = doc.to_html

    <<~HTML
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 15px;
            line-height: 1.6;
            color: #1f2937;
          }
          p { margin: 0 0 1em 0; }
          a { color: #2563eb; text-decoration: underline; }
          img { max-width: 100%; height: auto; }
          table { width: 100%; border-collapse: collapse; }
        </style>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1f2937; margin: 0; padding: 16px;">
        #{cleaned_body}
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
      elsif in_code_block || line.start_with?("#") || line.start_with?(">") || line.start_with?("- ") || line.start_with?("* ") || line.match?(/^\d+\.\s/) || line.blank? || line.start_with?("<") || line.start_with?(":::")
        processed_lines << line
      else
        processed_lines << "#{line}  "
      end
    end

    Kramdown::Document.new(processed_lines.join("\n")).to_html
  rescue => e
    escaped = ERB::Util.html_escape(text)
    escaped.gsub!(/\*\*(.+?)\*\*/, '<strong>\1</strong>')
    escaped.gsub!(/\*(.+?)\*/, '<em>\1</em>')
    escaped.gsub!(/\[(.+?)\]\((.+?)\)/, '<a href="\2">\1</a>')
    escaped.gsub!(/\n/, '<br>')
    "<p>#{escaped}</p>"
  end
end
