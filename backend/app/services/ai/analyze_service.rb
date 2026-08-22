require "faraday"
require "json"

class Ai::AnalyzeService
  Result = Struct.new(:success?, :data, :error)

  PROMPT = <<~PROMPT
    You are an email analysis assistant. Analyze the email and return structured JSON.

    FROM: %{from}
    SUBJECT: %{subject}
    DATE: %{date}
    BODY: %{body}

    Extract useful information and return ONLY valid JSON matching this schema:
    {
      "type": "invoice|tracking|ticket|bank|verification|travel|otp|order|meeting|general",
      "language": "tr|en|...",
      "summary": "Kısa özet (max 2 cümle)",
      "sender_context": "Kimin gönderdiği ve bağlam",
      "actionable_items": [
        { "label": "Öğe", "value": "123", "copyable": true, "url": null }
      ],
      "calendar_suggestion": {
        "title": "Etkinlik başlığı",
        "date": "YYYY-MM-DD",
        "time": "HH:MM",
        "all_day": false,
        "description": "Açıklama"
      },
      "priority": "high|medium|low",
      "tags": ["etiket1"]
    }
  PROMPT

  def self.call(user, email)
    return Result.new(false, nil, "AI not configured") unless user.ai_configured?

    prompt = PROMPT % {
      from: email.from_address.to_s,
      subject: email.subject.to_s,
      date: email.created_at.to_s,
      body: email.body_text.to_s.first(3000)
    }

    raw = execute_ai(user, prompt, json_mode: true)
    return Result.new(false, nil, "Empty AI response") if raw.blank?

    # Clean markdown fences from response if present
    cleaned = raw.to_s.strip.gsub(/\A```json\s*/i, "").gsub(/\A```\s*/, "").gsub(/```\s*\z/, "").strip
    data = JSON.parse(cleaned)
    Result.new(true, data, nil)
  rescue JSON::ParserError => e
    Result.new(false, nil, "Invalid JSON: #{e.message}")
  rescue => e
    Result.new(false, nil, e.message)
  end

  def self.summarize(user, email)
    return Result.new(false, nil, "AI not configured") unless user.ai_configured?

    prompt = <<~SUM
      You are an expert executive email assistant. Summarize the following email in 2-3 concise bullet points in the same language as the email.

      FROM: #{email.from_address}
      SUBJECT: #{email.subject}
      BODY: #{email.body_text.to_s.first(2500)}
    SUM

    res = execute_ai(user, prompt, json_mode: false)
    Result.new(true, res.to_s.strip, nil)
  rescue => e
    Result.new(false, nil, e.message)
  end

  def self.generate_reply(user, email, user_instructions, tone = "friendly")
    return Result.new(false, nil, "AI not configured") unless user.ai_configured?

    custom_notes = user_instructions.presence || "Draft an appropriate, polite response."
    prompt = <<~REP
      You are drafting an email reply on behalf of #{user.name || "the recipient"}.
      
      ORIGINAL EMAIL:
      From: #{email.from_address}
      Subject: #{email.subject}
      Content: #{email.body_text.to_s.first(2500)}

      INSTRUCTIONS / USER INTENT:
      #{custom_notes}

      TONE: #{tone}

      RULES:
      - Reply in the same language as the original email.
      - Sound natural, authentic, and clear.
      - Output ONLY the email response text without greetings metadata or markdown codeblocks.
    REP

    res = execute_ai(user, prompt, json_mode: false)
    reply_text = res.to_s.gsub(/\A```.*?\n/, "").gsub(/```\z/, "").strip
    Result.new(true, reply_text, nil)
  rescue => e
    Result.new(false, nil, e.message)
  end

  private

  def self.execute_ai(user, prompt, json_mode: false)
    provider = user.ai_provider.to_s.downcase.presence || "gemini"
    api_key = user.active_ai_key
    model = user.ai_model.presence

    case provider
    when "gemini"
      model ||= "gemini-2.0-flash"
      call_gemini(api_key, model, prompt)
    when "claude"
      model ||= "claude-3-5-sonnet-latest"
      call_claude(api_key, model, prompt)
    when "openai"
      model ||= "gpt-4o-mini"
      call_openai(api_key, model, prompt, json_mode: json_mode)
    else
      raise "Unsupported AI provider: #{provider}"
    end
  end

  def self.call_gemini(api_key, model, prompt)
    conn = Faraday.new("https://generativelanguage.googleapis.com") do |f|
      f.request :json
      f.response :json
      f.adapter Faraday.default_adapter
    end
    # Ensure model doesn't have duplicate models/ prefix
    clean_model = model.to_s.gsub("models/", "")
    res = conn.post("/v1beta/models/#{clean_model}:generateContent?key=#{api_key}") do |req|
      req.headers["Content-Type"] = "application/json"
      req.body = { contents: [{ parts: [{ text: prompt }] }] }
    end

    if res.status != 200
      err = res.body.is_a?(Hash) ? res.body.dig("error", "message") : res.body
      raise "Gemini API Error (#{res.status}): #{err}"
    end

    text = res.body.dig("candidates", 0, "content", "parts", 0, "text")
    text.to_s
  end

  def self.call_claude(api_key, model, prompt)
    conn = Faraday.new("https://api.anthropic.com") do |f|
      f.request :json
      f.response :json
      f.adapter Faraday.default_adapter
    end
    res = conn.post("/v1/messages") do |req|
      req.headers["x-api-key"] = api_key
      req.headers["anthropic-version"] = "2023-06-01"
      req.headers["Content-Type"] = "application/json"
      req.body = { model: model, max_tokens: 1500, messages: [{ role: "user", content: prompt }] }
    end

    if res.status != 200
      err = res.body.is_a?(Hash) ? res.body.dig("error", "message") : res.body
      raise "Claude API Error (#{res.status}): #{err}"
    end

    res.body.dig("content", 0, "text").to_s
  end

  def self.call_openai(api_key, model, prompt, json_mode: false)
    conn = Faraday.new("https://api.openai.com") do |f|
      f.request :json
      f.response :json
      f.adapter Faraday.default_adapter
    end
    body = { model: model, messages: [{ role: "user", content: prompt }] }
    body[:response_format] = { type: "json_object" } if json_mode
    res = conn.post("/v1/chat/completions") do |req|
      req.headers["Authorization"] = "Bearer #{api_key}"
      req.headers["Content-Type"] = "application/json"
      req.body = body
    end

    if res.status != 200
      err = res.body.is_a?(Hash) ? res.body.dig("error", "message") : res.body
      raise "OpenAI API Error (#{res.status}): #{err}"
    end

    res.body.dig("choices", 0, "message", "content").to_s
  end
end
