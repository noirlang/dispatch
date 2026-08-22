class Email::SenderAvatarService
  KNOWN_LOGOS = Rails.cache.fetch("known_logos", expires_in: 1.day) do
    YAML.load_file(Rails.root.join("config/known_sender_logos.yml")) rescue {}
  end

  # Returns { name, avatar_url, is_known_company }
  def self.for(email_address)
    return default(email_address) if email_address.blank?

    # 1. Check if sender is a registered Dispatch user
    user = User.find_by(email: email_address.downcase)
    if user
      return {
        name:             user.name,
        avatar_url:       user.avatar_path,
        is_known_company: false,
        initials:         initials(user.name)
      }
    end

    # 2. Check if sender has a custom profile
    profile = SenderProfile.find_by(email: email_address.downcase)
    if profile
      return {
        name:             profile.display_name || email_address,
        avatar_url:       profile.avatar_url,
        is_known_company: profile.is_known_company,
        initials:         initials(profile.display_name || email_address)
      }
    end

    # 3. Check known company logos by domain
    domain = email_address.split("@").last&.downcase
    company = KNOWN_LOGOS[domain]
    if company
      # Auto-create profile for future use
      SenderProfile.find_or_create_by(email: email_address.downcase) do |p|
        p.display_name     = company["name"]
        p.avatar_url       = company["logo_url"]
        p.is_known_company = true
      end
      return {
        name:             company["name"],
        avatar_url:       company["logo_url"],
        is_known_company: true,
        initials:         company["name"][0..1].upcase
      }
    end

    # 4. Check parent domain (e.g. mail.microsoft.com → microsoft.com)
    parent_domain = domain&.split(".")&.last(2)&.join(".")
    if parent_domain && parent_domain != domain
      company = KNOWN_LOGOS[parent_domain]
      if company
        return {
          name:             company["name"],
          avatar_url:       company["logo_url"],
          is_known_company: true,
          initials:         company["name"][0..1].upcase
        }
      end
    end

    # 5. Fallback: DuckDuckGo favicon service
    {
      name:             email_address,
      avatar_url:       "https://icons.duckduckgo.com/ip3/#{domain}.ico",
      is_known_company: false,
      initials:         initials(email_address)
    }
  end

  def self.initials(str)
    str.split(/[\s@._-]/).reject(&:empty?).first(2).map { |w| w[0]&.upcase }.join
  end

  def self.default(email)
    { name: email, avatar_url: nil, is_known_company: false, initials: "?" }
  end
end
