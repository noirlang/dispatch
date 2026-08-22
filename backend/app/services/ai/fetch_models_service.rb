require "net/http"
require "json"
require "uri"

class Ai::FetchModelsService
  Result = Struct.new(:success?, :models, :error)

  def self.call(provider, api_key)
    return Result.new(false, [], "API key is required") if api_key.blank?

    case provider.to_s.downcase
    when "gemini"
      fetch_gemini_models(api_key)
    when "openai"
      fetch_openai_models(api_key)
    when "claude"
      fetch_claude_models(api_key)
    else
      Result.new(false, [], "Unsupported provider: #{provider}")
    end
  rescue => e
    Result.new(false, [], "Failed to fetch models: #{e.message}")
  end

  private

  def self.fetch_gemini_models(api_key)
    uri = URI("https://generativelanguage.googleapis.com/v1beta/models?key=#{api_key}")
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = 8
    http.read_timeout = 8

    req = Net::HTTP::Get.new(uri)
    res = http.request(req)

    if res.is_a?(Net::HTTPSuccess)
      data = JSON.parse(res.body)
      raw_models = data["models"] || []
      models = raw_models.select do |m|
        methods = m["supportedGenerationMethods"] || []
        methods.include?("generateContent") && m["name"].to_s.include?("gemini")
      end.map do |m|
        clean_id = m["name"].to_s.gsub("models/", "")
        display = m["displayName"] || clean_id
        { id: clean_id, name: "#{display} (#{clean_id})" }
      end.sort_by { |m| m[:id] }

      Result.new(true, models, nil)
    else
      err = JSON.parse(res.body)["error"]["message"] rescue res.body
      Result.new(false, [], "Gemini API Error: #{err}")
    end
  end

  def self.fetch_openai_models(api_key)
    uri = URI("https://api.openai.com/v1/models")
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = 8
    http.read_timeout = 8

    req = Net::HTTP::Get.new(uri)
    req["Authorization"] = "Bearer #{api_key}"
    res = http.request(req)

    if res.is_a?(Net::HTTPSuccess)
      data = JSON.parse(res.body)
      raw_models = data["data"] || []
      models = raw_models.select do |m|
        id = m["id"].to_s
        (id.start_with?("gpt-") || id.start_with?("o1") || id.start_with?("o3") || id.start_with?("chatgpt")) && !id.include?("audio") && !id.include?("realtime")
      end.map do |m|
        { id: m["id"], name: m["id"] }
      end.sort_by { |m| m[:id] }

      Result.new(true, models, nil)
    else
      err = JSON.parse(res.body)["error"]["message"] rescue res.body
      Result.new(false, [], "OpenAI API Error: #{err}")
    end
  end

  def self.fetch_claude_models(api_key)
    uri = URI("https://api.anthropic.com/v1/models")
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = 8
    http.read_timeout = 8

    req = Net::HTTP::Get.new(uri)
    req["x-api-key"] = api_key
    req["anthropic-version"] = "2023-06-01"
    res = http.request(req)

    if res.is_a?(Net::HTTPSuccess)
      data = JSON.parse(res.body)
      raw_models = data["data"] || []
      models = raw_models.map do |m|
        { id: m["id"], name: m["display_name"] ? "#{m["display_name"]} (#{m["id"]})" : m["id"] }
      end.sort_by { |m| m[:id] }

      Result.new(true, models, nil)
    else
      # If models endpoint is not accessible or returns error, try a lightweight verification or fallback
      err = JSON.parse(res.body)["error"]["message"] rescue res.body
      Result.new(false, [], "Claude API Error: #{err}")
    end
  end
end
