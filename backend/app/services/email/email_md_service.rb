class Email::EmailMdService
  def self.to_html(raw_markdown)
    return "" if raw_markdown.blank?

    cleaned_body = render_markdown(raw_markdown)

    <<~HTML
      <!DOCTYPE html>
      <html lang="tr" xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <style type="text/css">
          :root {
            color-scheme: light dark;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 15px;
            line-height: 1.6;
            color: #18181b;
            background-color: #ffffff;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }
          @media (prefers-color-scheme: dark) {
            body, .dispatch-body {
              background-color: #09090b !important;
              color: #f4f4f5 !important;
            }
            p, h1, h2, h3, h4, h5, h6, li, span, td, th {
              color: #f4f4f5 !important;
            }
            a {
              color: #60a5fa !important;
            }
            blockquote {
              border-left-color: #3f3f46 !important;
              color: #a1a1aa !important;
            }
            pre, code {
              background-color: #18181b !important;
              color: #f4f4f5 !important;
              border-color: #27272a !important;
            }
            th {
              background-color: #18181b !important;
              color: #f4f4f5 !important;
            }
            td, th {
              border-color: #27272a !important;
            }
          }
        </style>
      </head>
      <body class="dispatch-body" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #18181b; background-color: #ffffff; margin: 0; padding: 0;">
        <div class="dispatch-content" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #18181b; max-width: 680px; margin: 0 auto; padding: 16px;">
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

    # Style elements cleanly and explicitly for universal email client compatibility
    doc = Nokogiri::HTML.fragment(html.to_s)

    doc.css("p").each do |p|
      p["style"] = "margin: 0 0 14px 0; color: #18181b; line-height: 1.6; font-size: 15px;"
    end

    doc.css("h1").each do |h|
      h["style"] = "font-size: 22px; font-weight: 700; color: #09090b; margin: 24px 0 12px 0; line-height: 1.3;"
    end

    doc.css("h2").each do |h|
      h["style"] = "font-size: 18px; font-weight: 600; color: #09090b; margin: 20px 0 10px 0; line-height: 1.3;"
    end

    doc.css("h3, h4, h5, h6").each do |h|
      h["style"] = "font-size: 16px; font-weight: 600; color: #09090b; margin: 16px 0 8px 0; line-height: 1.3;"
    end

    doc.css("ul, ol").each do |list|
      list["style"] = "margin: 0 0 14px 0; padding-left: 24px; color: #18181b;"
    end

    doc.css("li").each do |li|
      li["style"] = "margin-bottom: 4px; line-height: 1.6; color: #18181b;"
    end

    doc.css("blockquote").each do |bq|
      bq["style"] = "border-left: 3px solid #d4d4d8; margin: 14px 0; padding: 4px 0 4px 12px; color: #52525b; font-style: normal;"
    end

    doc.css("a").each do |a|
      a["style"] = "color: #2563eb; text-decoration: underline; font-weight: 500;"
    end

    doc.css("table").each do |tbl|
      tbl["style"] = "border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 14px;"
    end

    doc.css("th, td").each do |cell|
      cell["style"] = "border: 1px solid #e4e4e7; padding: 8px 12px; text-align: left; color: #18181b;"
    end

    doc.css("th").each do |th|
      th["style"] = "#{th['style']}; background-color: #f4f4f5; font-weight: 600;"
    end

    doc.css("pre").each do |pre|
      pre["style"] = "background-color: #f4f4f5; color: #18181b; border: 1px solid #e4e4e7; border-radius: 6px; padding: 12px 16px; overflow-x: auto; margin: 14px 0; font-family: monospace; font-size: 13px;"
    end

    doc.css("code").each do |c|
      c["style"] = "background-color: #f4f4f5; color: #18181b; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px;"
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
    "<p style='color:#18181b;line-height:1.6;font-size:15px;'>#{escaped}</p>"
  end
end
