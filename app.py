import os
import uuid
from functools import wraps
from pathlib import Path

from flask import (
    Flask,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

from analysis_service import AnalysisError, AnalysisService

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = "uploads"
app.config["STATIC_FOLDER"] = "static/images"
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024
app.config["ALLOWED_EXTENSIONS"] = {"py"}
app.config["DEBUG"] = os.getenv("FLASK_DEBUG", "0") == "1"
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-change-this-key")

# 基础用户名密码认证（建议通过环境变量覆盖）
app.config["AUTH_USERNAME"] = os.getenv("AUTH_USERNAME", "admin")
app.config["AUTH_PASSWORD_HASH"] = generate_password_hash(os.getenv("AUTH_PASSWORD", "Admin@123"))

upload_dir = Path(app.config["UPLOAD_FOLDER"])
static_dir = Path(app.config["STATIC_FOLDER"])
upload_dir.mkdir(parents=True, exist_ok=True)
static_dir.mkdir(parents=True, exist_ok=True)

analysis_service = AnalysisService(static_dir)


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in app.config["ALLOWED_EXTENSIONS"]


def login_required(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if not session.get("authenticated"):
            return redirect(url_for("login", next=request.path))
        return view_func(*args, **kwargs)

    return wrapper


@app.route("/login", methods=["GET", "POST"])
def login():
    if session.get("authenticated"):
        return redirect(url_for("index"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        expected_username = app.config["AUTH_USERNAME"]
        password_hash = app.config["AUTH_PASSWORD_HASH"]

        if username == expected_username and check_password_hash(password_hash, password):
            session["authenticated"] = True
            session["username"] = username
            flash("登录成功。", "success")
            next_url = request.args.get("next") or url_for("index")
            return redirect(next_url)

        flash("用户名或密码错误，请重试。", "error")

    return render_template("login.html")


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    flash("已安全退出登录。", "info")
    return redirect(url_for("login"))


@app.route("/", methods=["GET", "POST"])
@login_required
def index():
    image_url = None
    test_cases = []
    warnings = []
    blocked_paths = []
    error_message = None
    source_code = None
    source_filename = None

    if request.method == "POST":
        file = request.files.get("file")

        if not file or not file.filename:
            error_message = "请选择一个 .py 文件后再提交。"
        elif not allowed_file(file.filename):
            error_message = "仅支持上传 .py 文件。"
        else:
            safe_name = secure_filename(file.filename)
            suffix = Path(safe_name).suffix or ".py"
            random_name = f"{Path(safe_name).stem}_{uuid.uuid4().hex[:8]}{suffix}"
            file_path = upload_dir / random_name
            file.save(file_path)

            try:
                source_code = file_path.read_text(encoding="utf-8")
                source_filename = safe_name
                result = analysis_service.analyze_file(file_path)
                test_cases = result["test_cases"]
                warnings = result["warnings"]
                blocked_paths = result["blocked_paths"]
                image_url = url_for("static", filename=result["output_filename"])
            except (UnicodeDecodeError, SyntaxError):
                error_message = "上传文件不是合法的 UTF-8 Python 源码，请检查后重试。"
            except AnalysisError as exc:
                error_message = str(exc)
            except Exception:
                error_message = "分析过程中发生未知错误，请稍后重试。"

    return render_template(
        "index.html",
        image_url=image_url,
        test_cases=test_cases,
        warnings=warnings,
        blocked_paths=blocked_paths,
        error_message=error_message,
        source_code=source_code,
        source_filename=source_filename,
        username=session.get("username", ""),
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=app.config["DEBUG"])
