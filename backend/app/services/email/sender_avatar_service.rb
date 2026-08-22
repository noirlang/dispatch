class Email::SenderAvatarService
  KNOWN_LOGOS = Rails.cache.fetch("known_logos", expires_in: 1.day) do
    YAML.load_file(Rails.root.join("config/known_sender_logos.yml")) rescue {}
  end

  # Returns { name, avatar_url, is_known_company, is_dispatch_user, initials }
  def self.for(email_address)
    return default(email_address) if email_address.blank?

    email_clean = email_address.downcase.strip
    user = User.find_by(email: email_clean)
    profile = SenderProfile.find_by(email: email_clean)

    # 1. Registered Dispatch User on this server
    if user.present?
      avatar = user.avatar_path.presence || profile&.avatar_url
      return {
        name:             user.name,
        avatar_url:       avatar,
        is_known_company: false,
        is_dispatch_user: true,
        initials:         initials(user.name)
      }
    end

    # 2. Custom external contact profile
    if profile&.avatar_url.present?
      display_name = profile.display_name.presence || email_address
      return {
        name:             display_name,
        avatar_url:       profile.avatar_url,
        is_known_company: profile.is_known_company,
        is_dispatch_user: false,
        initials:         initials(display_name)
      }
    end

    # 3. Check known company logos by domain
    domain = email_clean.split("@").last&.downcase
    company = KNOWN_LOGOS[domain]
    if company
      return {
        name:             company["name"],
        avatar_url:       company["logo_url"],
        is_known_company: true,
        is_dispatch_user: false,
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
          is_dispatch_user: false,
          initials:         company["name"][0..1].upcase
        }
      end
    end

    # 5. Gravatar fallback (Gmail / universal email avatars)
    gravatar_hash = Digest::MD5.hexdigest(email_clean)
    gravatar_url = "https://www.gravatar.com/avatar/#{gravatar_hash}?d=404"

    resolved_name = profile&.display_name.presence || email_address
    {
      name:             resolved_name,
      avatar_url:       gravatar_url,
      is_known_company: false,
      is_dispatch_user: false,
      initials:         initials(resolved_name)
    }
  end

  def self.initials(str)
    str.split(/[\s@._-]/).reject(&:empty?).first(2).map { |w| w[0]&.upcase }.join
  end

  def self.default(email)
    { name: email, avatar_url: nil, is_known_company: false, is_dispatch_user: false, initials: "?" }
  end
end
