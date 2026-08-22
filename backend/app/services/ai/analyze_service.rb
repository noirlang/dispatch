class Ai::AnalyzeService
  Result = Struct.new(:success?, :data, :error)

  PROMPT = <<~PROMPT
    You are an email analysis assistant. Analyze the email and return structured JSON.

    FROM: %{from}
    SUBJECT: %{subject}
    DATE: %{date}
    BODY: %{body}

    Extract useful information and return ONLY valid JSON in this format:
    {
      "type": "invoice|tracking|ticket|bank|verification|travel|otp|order|meeting|general",
      "language": "tr|en|...",
      "summary": "Brief summary (max 2 sentences)",
      "sender_context": "Who sent this and why",
      "actionable_items": [
        { "label": "Order No", "value": "123", "copyable": true, "url": null }
      ],
      "calendar_suggestion": { "title": "...", "date": "YYYY-MM-DD", "time": "HH:MM", "all_day": false, "description": "..." } or null,
      "priority": "high|medium|low",
      "tags": ["tag1"],
      "expires_at": "ISO8601" or null
    }

    Rules:
    - Never include passwords, CVV, or national IDs
    - Detect language from email content
    - Set priority=high for travel (same day) or urgent deliveries
    - Use type=general if nothing specific matches
  PROMPT

  def self.call(user, email)
    prompt = PROMPT % {
      from: email.from_address,
      subject: email.subject,
      date: email.created_at.to_s,
      body: email.body_text&.first(3000)
    }

    response = case user.ai_provider
               when "gemini" then call_gemini(user.gemini_key, prompt)
               when "claude" then call_claude(user.claude_key, prompt)
               when "openai" then call_openai(user.openai_key, prompt)
               else return Result.new(false, nil, "No AI provider configured")
               end

    data = JSON.parse(response)
    Result.new(true, data, nil)
  rescue JSON::ParserError => e
    Result.new(false, nil, "Invalid JSON response: #{e.message}")
  rescue => e
    Result.new(false, nil, e.message)
  end

  private

  def self.call_gemini(api_key, prompt)
    conn = Faraday.new("https://generativelanguage.googleapis.com") do |f|
      f.request :json
      f.response :json
    end
    res = conn.post("/v1beta/models/gemini-1.5-flash:generateContent?key=#{api_key}") do |req|
      req.body = { contents: [{ parts: [{ text: prompt }] }] }
    end
    res.body.dig("candidates", 0, "content", "parts", 0, "text")
      &.gsub(/```json\n?/, "")&.gsub(/```\n?/, "")
  end

  def self.call_claude(api_key, prompt)
    conn = Faraday.new("https://api.anthropic.com") do |f|
      f.request :json
      f.response :json
    end
    res = conn.post("/v1/messages") do |req|
      req.headers["x-api-key"] = api_key
      req.headers["anthropic-version"] = "2023-06-01"
      req.body = { model: "claude-3-haiku-20240307", max_tokens: 1024,
                   messages: [{ role: "user", content: prompt }] }
    end
    res.body.dig("content", 0, "text")
  end

  def self.call_openai(api_key, prompt)
    conn = Faraday.new("https://api.openai.com") do |f|
      f.request :json
      f.response :json
    end
    res = conn.post("/v1/chat/completions") do |req|
      req.headers["Authorization"] = "Bearer #{api_key}"
      req.body = { model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }],
                   response_format: { type: "json_object" } }
    end
    res.body.dig("choices", 0, "message", "content")
  end
end
