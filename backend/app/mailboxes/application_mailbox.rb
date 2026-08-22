class ApplicationMailbox < ActionMailbox::Base
  routing /\Ablog@/i => :blog
  routing :all        => :dispatch
end
