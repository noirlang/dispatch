class Email::EmailMdService
  def self.to_html(raw_markdown)
    return "" if raw_markdown.blank?

    md = raw_markdown.to_s.dup

    # 1. Process Callout Blocks: ::: callout [type] ... :::
    md.gsub!(/:::\s*callout(?:\s+([a-zA-Z0-9_-]+))?\s*\n([\s\S]*?)\n\s*:::/) do
      type = ($1 || "info").downcase
      inner = $2.strip
      rendered_inner = render_markdown(inner)

      border_color = case type
                     when /warn|alert/ then "#ef4444"
                     when /success|check/ then "#22c55e"
                     when /tip|purple/ then "#a855f7"
                     else "#3b82f6"
                     end
      bg_color = case type
                 when /warn|alert/ then "#fef2f2"
                 when /success|check/ then "#f0fdf4"
                 when /tip|purple/ then "#faf5ff"
                 else "#eff6ff"
                 end
      text_color = case type
                   when /warn|alert/ then "#991b1b"
                   when /success|check/ then "#166534"
                   when /tip|purple/ then "#6b21a8"
                   else "#1e40af"
                   end

      <<~HTML
        <div style="background-color: #{bg_color}; border-left: 4px solid #{border_color}; border-radius: 6px; padding: 12px 16px; margin: 14px 0; color: #{text_color}; font-size: 13px; line-height: 1.5;">
          #{rendered_inner}
        </div>
      HTML
    end

    # 2. Process EmailMD Buttons: [Button Title](url){button [style]}
    md.gsub!(/\[([^\]]+)\]\(([^)]+)\)\{button(?:\s+([a-zA-Z0-9_-]+))?\}/) do
      text = $1
      url = $2
      style = ($3 || "primary").downcase
      bg = style == "secondary" ? "#334155" : "#2563eb"

      <<~HTML
        <table border="0" cellspacing="0" cellpadding="0" style="margin: 12px 0; display: inline-block;">
          <tr>
            <td align="center" style="border-radius: 6px; background-color: #{bg};">
              <a href="#{url}" target="_blank" style="font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff; text-decoration: none; padding: 9px 18px; border-radius: 6px; border: 1px solid #{bg}; display: inline-block; font-weight: 600;">
                #{text}
              </a>
            </td>
          </tr>
        </table>
      HTML
    end

    render_markdown(md)
  end

  def self.render_markdown(text)
    require "kramdown"

    # Pre-process line breaks in non-code, non-quote blocks so single newlines are preserved
    lines = text.split("\n")
    processed_lines = []
    in_code_block = false

    lines.each do |line|
      if line.start_with?("```")
        in_code_block = !in_code_block
        processed_lines << line
      elsif in_code_block || line.start_with?("#") || line.start_with?(">") || line.start_with?("- ") || line.start_with?("* ") || line.match?(/^\d+\.\s/) || line.blank? || line.start_with?("<")
        processed_lines << line
      else
        # Add 2 spaces at the end of regular lines to ensure hard wrap in Markdown
        processed_lines << "#{line}  "
      end
    end

    Kramdown::Document.new(processed_lines.join("\n")).to_html
  rescue => e
    # Fallback to simple parser
    escaped = ERB::Util.html_escape(text)
    escaped.gsub!(/\*\*(.+?)\*\*/, '<strong>\1</strong>')
    escaped.gsub!(/\*(.+?)\*/, '<em>\1</em>')
    escaped.gsub!(/\[(.+?)\]\((.+?)\)/, '<a href="\2">\1</a>')
    escaped.gsub!(/\n/, '<br>')
    "<p>#{escaped}</p>"
  end
end
