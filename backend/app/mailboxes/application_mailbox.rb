class ApplicationMailbox < ActionMailbox::Base
  routing :all => :dispatch
end
