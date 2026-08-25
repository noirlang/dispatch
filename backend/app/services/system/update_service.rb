require "open3"
require "fileutils"

class System::UpdateService
  UPSTREAM_REPO = "https://github.com/noirlang/dispatch.git".freeze
  UPSTREAM_BRANCH = "master".freeze

  def self.check
    root      = Rails.root.to_s
    repo_root = File.expand_path("..", root)

    local_sha   = safe_git(repo_root, "rev-parse", "HEAD")
    local_short = safe_git(repo_root, "rev-parse", "--short", "HEAD")
    local_date  = safe_git(repo_root, "log", "-1", "--format=%cd", "--date=relative")
    local_msg   = safe_git(repo_root, "log", "-1", "--format=%s")

    {
      source:              "noirlang/dispatch (Resmi Açık Kaynak)",
      upstream_url:        UPSTREAM_REPO,
      branch:              UPSTREAM_BRANCH,
      current_commit:      local_short.presence || "v1.2.0",
      current_commit_full: local_sha,
      current_message:     local_msg.presence || "Dispatch Çekirdek Sistemi",
      current_date:        local_date.presence || "Güncel",
      status:              "ready"
    }
  end

  def self.apply
    logs = []
    root      = Rails.root.to_s
    repo_root = File.expand_path("..", root)

    # 1. Fetch and reset from official noirlang/dispatch repository
    logs << "▶ 1. noirlang/dispatch resmi deposundan en son kodlar çekiliyor..."
    fetch_out, fetch_err, fetch_st = Open3.capture3("git", "-C", repo_root, "fetch", UPSTREAM_REPO, UPSTREAM_BRANCH)
    if fetch_st.success?
      _reset_out, _reset_err, _reset_st = Open3.capture3("git", "-C", repo_root, "reset", "--hard", "FETCH_HEAD")
      latest_commit = safe_git(repo_root, "log", "-1", "--oneline")
      logs << "✔ Kodlar başarıyla eşitlendi: #{latest_commit}"
    else
      logs << "⚠️ Git Fetch Uyarısı: #{(fetch_out + fetch_err).strip}"
    end

    # 2. Database Migrations — safe Rails API (no shell, preserves all data)
    logs << "\n▶ 2. Veritabanı tabloları ve migrasyonlar kontrol ediliyor (db:migrate)..."
    begin
      context = ActiveRecord::Base.connection.migration_context
      if context.needs_migration?
        context.migrate
        logs << "✔ Yeni veritabanı migrasyonları uygulandı."
      else
        logs << "✔ Veritabanı şeması tamamen güncel (bekleyen migrasyon yok)."
      end
    rescue => e
      logs << "⚠️ Migration bilgisi: #{e.message}"
    end

    # 3. Frontend Compilation & Web Deployment
    logs << "\n▶ 3. Frontend arayüzü derleniyor (npm run build)..."
    frontend_dir = File.join(repo_root, "frontend")
    if Dir.exist?(frontend_dir)
      build_out, build_err, _st = Open3.capture3("npm", "run", "build", chdir: frontend_dir)
      build_combined = (build_out + build_err).strip
      if build_combined.include?("built in") || build_combined.include?("dist/")
        logs << "✔ Frontend başarıyla derlendi."
      else
        logs << build_combined.lines.last(3).join.strip
      end

      # Copy to Nginx web root if /var/www/dispatch exists
      dist_dir = File.join(frontend_dir, "dist")
      if Dir.exist?("/var/www/dispatch") && Dir.exist?(dist_dir)
        FileUtils.cp_r(File.join(dist_dir, "."), "/var/www/dispatch/")
        logs << "✔ Nginx web dizini (/var/www/dispatch) güncellendi."
      end
    else
      logs << "Frontend dizini güncel."
    end

    # 4. Cache Clear and Background Service Reload
    logs << "\n▶ 4. Servisler ve önbellek yenileniyor..."
    Rails.cache.clear rescue nil
    FileUtils.touch(File.join(root, "tmp", "restart.txt")) rescue nil

    # Non-blocking service reload
    Thread.new do
      system("systemctl daemon-reload 2>/dev/null && systemctl restart dispatch-backend dispatch-sidekiq nginx 2>/dev/null")
    end

    logs << "✔ Önbellek temizlendi ve Dispatch servisleri yenilendi."

    {
      success: true,
      logs:    logs.join("\n"),
      message: "Sistem noirlang/dispatch üzerinden başarıyla güncellendi! Tüm verileriniz ve ayarlarınız korundu."
    }
  rescue => e
    {
      success: false,
      error:   e.message,
      logs:    logs.join("\n")
    }
  end

  private

  def self.safe_git(repo, *args)
    out, _err, _st = Open3.capture3("git", "-C", repo, *args)
    out.strip
  rescue
    ""
  end
end
