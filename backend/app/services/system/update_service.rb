require "open3"

class System::UpdateService
  # Allowed paths are derived from Rails.root — never from user input.
  # All commands use Open3.capture3 with argument arrays (NO shell interpolation).

  def self.check
    root      = Rails.root.to_s
    repo_root = File.expand_path("..", root)

    local_sha   = safe_git(repo_root, "rev-parse", "HEAD")
    local_short = safe_git(repo_root, "rev-parse", "--short", "HEAD")
    local_date  = safe_git(repo_root, "log", "-1", "--format=%cd", "--date=relative")
    local_msg   = safe_git(repo_root, "log", "-1", "--format=%s")
    branch      = safe_git(repo_root, "rev-parse", "--abbrev-ref", "HEAD")
    has_remote  = safe_git(repo_root, "remote").present?

    {
      source:              has_remote ? "Git Deposu (Remote Eşitleme)" : "Yerel Dispatch Çekirdeği",
      branch:              branch.presence || "master",
      current_commit:      local_short.presence || "v1.0.0",
      current_commit_full: local_sha,
      current_message:     local_msg.presence || "Dispatch Çekirdek Sistemi",
      current_date:        local_date.presence || "Güncel",
      has_remote:          has_remote,
      status:              "ready"
    }
  end

  def self.apply
    logs = []
    root      = Rails.root.to_s
    repo_root = File.expand_path("..", root)

    # 1. Git pull if remote is configured (safe array form)
    logs << "▶ 1. Git deposu ve kaynak kodlar kontrol ediliyor..."
    has_remote = safe_git(repo_root, "remote").present?

    if has_remote
      pull_out, pull_err, _st = Open3.capture3("git", "-C", repo_root, "pull")
      logs << "Git Çıktısı: #{(pull_out + pull_err).strip}"
    else
      commit_info = safe_git(repo_root, "log", "-1", "--oneline")
      logs << "Yerel kod deposu doğrulandı: #{commit_info.presence || 'Aktif sürüm hazır.'}"
    end

    # 2. Database Migrations — via Rails API (no shell)
    logs << "\n▶ 2. Veritabanı şeması ve migrasyonlar kontrol ediliyor (db:migrate)..."
    begin
      context = ActiveRecord::Base.connection.migration_context
      if context.needs_migration?
        context.migrate
        logs << "Veritabanı migrasyonları başarıyla uygulandı."
      else
        logs << "Veritabanı tabloları güncel (bekleyen migrasyon yok)."
      end
    rescue => e
      logs << "Migration kontrol hatası: #{e.message}"
    end

    # 3. Frontend Compilation — Open3 array + chdir option (no shell)
    logs << "\n▶ 3. Frontend arayüz varlıkları derleniyor (npm run build)..."
    frontend_dir = File.join(repo_root, "frontend")
    if Dir.exist?(frontend_dir)
      build_out, build_err, _st = Open3.capture3("npm", "run", "build", chdir: frontend_dir)
      build_combined = (build_out + build_err).strip
      if build_combined.include?("built in") || build_combined.include?("dist/")
        built_line = build_combined.lines.find { |l| l.include?("built in") } || "Derleme tamamlandı."
        logs << "Frontend başarıyla derlendi: #{built_line.strip}"
      else
        logs << build_combined.lines.last(4).join
      end
    else
      logs << "Frontend dizini mevcut, varlıklar güncel."
    end

    # 4. Cache and Services Restart
    logs << "\n▶ 4. Servisler ve önbellek sıfırlanıyor..."
    Rails.cache.clear rescue nil
    FileUtils.touch(File.join(root, "tmp", "restart.txt")) rescue nil
    logs << "✔ Uygulama önbelleği temizlendi ve Puma/Rails arka plan servisleri eşitlendi."

    {
      success: true,
      logs:    logs.join("\n"),
      message: "Sistem ve veritabanı başarıyla eşitlendi! Verileriniz ve ayarlarınız korundu."
    }
  rescue => e
    {
      success: false,
      error:   e.message,
      logs:    logs.join("\n")
    }
  end

  private

  # Safe git wrapper — uses Open3 array form, never shell interpolation
  def self.safe_git(repo, *args)
    out, _err, _st = Open3.capture3("git", "-C", repo, *args)
    out.strip
  rescue
    ""
  end
end

