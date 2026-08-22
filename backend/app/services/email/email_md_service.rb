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
    doc = Nokogiri::HTML(html.to_s)
    doc.xpath('//script|//object|//embed|//applet|//form|//iframe').remove
    doc.traverse do |node|
      if node.is_a?(Nokogiri::XML::Element)
        node.attributes.each do |name, _|
          node.remove_attribute(name) if name.downcase.start_with?("on")
        end
      end
    end
    doc.to_html
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
