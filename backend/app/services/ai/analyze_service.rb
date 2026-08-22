class Ai::AnalyzeService
  Result = Struct.new(:success?, :data, :error)

  MODELS = {
    "gemini" => [
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Fast & Efficient)" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Deep Analysis)" },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (Latest Next-Gen)" },
      { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite (Ultra Fast)" }
    ],
    "claude" => [
      { id: "claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet (Best Reasoning)" },
      { id: "claude-3-5-haiku-latest", name: "Claude 3.5 Haiku (High Speed)" },
      { id: "claude-3-opus-latest", name: "Claude 3 Opus" }
    ],
    "openai" => [
      { id: "gpt-4o", name: "GPT-4o (Omni Intelligent)" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini (Fast & Cost Effective)" },
      { id: "o3-mini", name: "o3-mini (Reasoning Model)" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo" }
    ]
  }.freeze

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
  PROMPT

  def self.models_for(provider)
    MODELS[provider.to_s] || []
  end

  def self.call(user, email)
    return Result.new(false, nil, "AI not configured") unless user.ai_configured?

    prompt = PROMPT % {
      from: email.from_address,
      subject: email.subject,
      date: email.created_at.to_s,
      body: email.body_text&.first(3000)
    }

    raw = execute_ai(user, prompt, json_mode: true)
    data = JSON.parse(raw)
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
      BODY: #{email.body_text&.first(2500)}
    SUM

    res = execute_ai(user, prompt, json_mode: false)
    Result.new(true, res.strip, nil)
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
      Content: #{email.body_text&.first(2500)}

      INSTRUCTIONS / USER INTENT:
      #{custom_notes}

      TONE: #{tone}

      RULES:
      - Reply in the same language as the original email.
      - Sound natural, authentic, and clear.
      - Output ONLY the email response text without greetings metadata or markdown codeblocks.
    REP

    res = execute_ai(user, prompt, json_mode: false)
    # Clean output
    reply_text = res.gsub(/\A```.*?\n/, "").gsub(/```\z/, "").strip
    Result.new(true, reply_text, nil)
  rescue => e
    Result.new(false, nil, e.message)
  end

  private

  def self.execute_ai(user, prompt, json_mode: false)
    model = user.ai_model.presence
    case user.ai_provider
    when "gemini"
      model ||= "gemini-1.5-flash"
      call_gemini(user.gemini_key, model, prompt)
    when "claude"
      model ||= "claude-3-5-haiku-latest"
      call_claude(user.claude_key, model, prompt)
    when "openai"
      model ||= "gpt-4o-mini"
      call_openai(user.openai_key, model, prompt, json_mode: json_mode)
    else
      raise "No AI provider configured"
    end
  end

  def self.call_gemini(api_key, model, prompt)
    conn = Faraday.new("https://generativelanguage.googleapis.com") do |f|
      f.request :json
      f.response :json
    end
    res = conn.post("/v1beta/models/#{model}:generateContent?key=#{api_key}") do |req|
      req.body = { contents: [{ parts: [{ text: prompt }] }] }
    end
    res.body.dig("candidates", 0, "content", "parts", 0, "text")
      &.gsub(/```json\n?/, "")&.gsub(/```\n?/, "")
  end

  def self.call_claude(api_key, model, prompt)
    conn = Faraday.new("https://api.anthropic.com") do |f|
      f.request :json
      f.response :json
    end
    res = conn.post("/v1/messages") do |req|
      req.headers["x-api-key"] = api_key
      req.headers["anthropic-version"] = "2023-06-01"
      req.body = { model: model, max_tokens: 1500, messages: [{ role: "user", content: prompt }] }
    end
    res.body.dig("content", 0, "text")
  end

  def self.call_openai(api_key, model, prompt, json_mode: false)
    conn = Faraday.new("https://api.openai.com") do |f|
      f.request :json
      f.response :json
    end
    body = { model: model, messages: [{ role: "user", content: prompt }] }
    body[:response_format] = { type: "json_object" } if json_mode
    res = conn.post("/v1/chat/completions") do |req|
      req.headers["Authorization"] = "Bearer #{api_key}"
      req.body = body
    end
    res.body.dig("choices", 0, "message", "content")
  end
end
