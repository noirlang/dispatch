class Ai::TestService
  Result = Struct.new(:success?, :error)

  def self.call(user)
    result = Ai::AnalyzeService.call(user, OpenStruct.new(
      from_address: "test@example.com",
      subject: "Test",
      created_at: Time.current,
      body_text: "This is a test email."
    ))
    result.success? ? Result.new(true, nil) : Result.new(false, result.error)
  end
end
