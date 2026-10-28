"""Construye las sentencias SQL de importación desde LearnDash.

Lee la exportación JSON y la base de datos de WordPress (cargada en MariaDB local)
y escribe lotes de sentencias en import_batches.json.
"""
import json, re, html, secrets, subprocess, unicodedata, collections, sys

EXPORT = "/mnt/user-data/uploads/Downloads/cyberespiracion-cursos-export.json"
OUT = sys.argv[1]
d = json.load(open(EXPORT))

S = lambda v: v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)


def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, int):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def mysql(sql):
    out = subprocess.run(
        ["mysql", "--default-character-set=utf8mb4", "-N", "-B", "wp", "-e", sql],
        capture_output=True, text=True, check=True,
    ).stdout
    return [line.split("\t") for line in out.splitlines() if line]


def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s or "leccion"


# ---------------------------------------------------------------- media
media = {m["url"].split("/uploads/")[-1]: m for m in d["media"]}
media_by_id = {int(m["id"]): m for m in d["media"]}


def storage_path(m):
    base = m["url"].rsplit("/", 1)[-1]
    return f"wp/{m['id']}-{base}"


def find_media(text):
    """Archivos de uploads citados en el texto, en orden y sin repetir."""
    found = []
    for u in re.findall(r"wp-content/uploads/([^\"'\s<>\\\]\[]+)", text):
        u = u.split("?")[0]
        m = media.get(u)
        if m and m["mime"] in ("audio/mpeg", "application/pdf") and m not in found:
            found.append(m)
    return found


YT = re.compile(r"(https?://(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)[A-Za-z0-9_\-]{6,}[^\s\"<]*)")


def clean_body(content, materials_raw):
    """Devuelve (video_url, extra_videos, body_html)."""
    videos = []
    for m in re.finditer(r'<!-- wp:embed (\{.*?\}) -->', content):
        try:
            u = json.loads(m.group(1)).get("url")
        except Exception:
            u = None
        if u and ("youtu" in u) and u not in videos:
            videos.append(u)
    body = re.sub(r"<!-- wp:embed .*?<!-- /wp:embed -->", "", content, flags=re.S)
    body = re.sub(r"<!-- /?wp:[^>]*-->", "", body)
    # Frases que remiten a la pestaña de materiales de LearnDash
    body = re.sub(r"<p>[^<]*(pesta[ñn]a|apartado) de materiales[^<]*(<br\s*/?>)?</p>", "", body, flags=re.I)
    # Texto adicional de "materiales" que no sea un audio o un enlace a un archivo
    extra = re.sub(r"\[audio[^\]]*\]\s*\[/audio\]", "", materials_raw or "")
    extra = re.sub(r"<audio.*?</audio>", "", extra, flags=re.S)
    extra = re.sub(r"<a [^>]*wp-content/uploads[^>]*>.*?</a>", "", extra, flags=re.S)
    extra = re.sub(r"https?://\S*wp-content/uploads\S*", "", extra)
    if re.sub(r"<[^>]+>|&nbsp;|\s", "", extra):
        body += "\n" + extra
    body = re.sub(r"<p>\s*(<br\s*/?>)?\s*</p>", "", body).strip()
    return (videos[0] if videos else None), videos[1:], (body or None)


def materials_only_raw(p):
    m = p.get("materials")
    return m.get("raw", "") if isinstance(m, dict) else S(m)


def materials_raw(p):
    m = p.get("materials")
    if isinstance(m, dict):
        return m.get("raw", "") + " " + m.get("rendered", "")
    return S(m)


posts = {int(p["id"]): p for p in d["lessons"] + d["topics"]}

# ---------------------------------------------------------------- build
stmts = []
asset_ids = {}  # wp media id -> placeholder key
asset_rows = []

course_order = {"223": 1, "690": 2, "233": 3}
courses = sorted(d["courses"], key=lambda c: course_order.get(str(c["id"]), 9))

lesson_rows = []  # dicts
module_rows = []
lesson_assets = []  # (lesson_wp, media_id, pos)
report = collections.Counter()

import phpserialize


def ld_steps(cid):
    raw = mysql(f"SELECT meta_value FROM wp_postmeta WHERE post_id={cid} AND meta_key='ld_course_steps'")[0][0]
    data = phpserialize.loads(raw.encode(), decode_strings=True)
    h = data["steps"]["h"]["sfwd-lessons"]
    out = {}
    for lid, lv in h.items():
        topics = lv.get("sfwd-topic") or {}
        out[str(lid)] = {"sfwd-topic": {str(t): {} for t in topics}}
    return out


for c in courses:
    cid = int(c["id"])
    steps = ld_steps(cid)
    has_topics = any(v.get("sfwd-topic") for v in steps.values())
    if has_topics:
        for mpos, (lwp, lv) in enumerate(steps.items()):
            lp = posts[int(lwp)]
            module_rows.append(dict(wp=int(lwp), course=cid, title=html.unescape(lp["title"]), pos=mpos))
            pos = 0
            vid, extra, body = clean_body(S(lp["content"]), materials_only_raw(lp))
            files = find_media(S(lp["content"]) + materials_raw(lp))
            if vid or body or files:
                lesson_rows.append(dict(wp=int(lwp), course=cid, module=int(lwp), title=html.unescape(lp["title"]),
                                        slug=lp["slug"], video=vid, extra=extra, body=body, pos=pos))
                for i, m in enumerate(files):
                    lesson_assets.append((int(lwp), int(m["id"]), i))
                pos += 1
                report["intro_lessons"] += 1
            for twp in lv.get("sfwd-topic", {}):
                tp = posts[int(twp)]
                vid, extra, body = clean_body(S(tp["content"]), materials_only_raw(tp))
                files = find_media(S(tp["content"]) + materials_raw(tp))
                lesson_rows.append(dict(wp=int(twp), course=cid, module=int(lwp), title=html.unescape(tp["title"]),
                                        slug=tp["slug"], video=vid, extra=extra, body=body, pos=pos))
                for i, m in enumerate(files):
                    lesson_assets.append((int(twp), int(m["id"]), i))
                pos += 1
    else:
        # Curso sin temas: un único bloque con las lecciones.
        module_rows.append(dict(wp=None, course=cid, title="Lecciones", pos=0, key=f"c{cid}"))
        for pos, lwp in enumerate(steps):
            lp = posts[int(lwp)]
            vid, extra, body = clean_body(S(lp["content"]), materials_only_raw(lp))
            files = find_media(S(lp["content"]) + materials_raw(lp))
            lesson_rows.append(dict(wp=int(lwp), course=cid, module=f"c{cid}", title=html.unescape(lp["title"]),
                                    slug=lp["slug"], video=vid, extra=extra, body=body, pos=pos))
            for i, m in enumerate(files):
                lesson_assets.append((int(lwp), int(m["id"]), i))

# Vídeos adicionales: se añaden al cuerpo como bloque de vídeo.
for r in lesson_rows:
    if r["extra"]:
        blocks = "".join(f'<div data-youtube="{html.escape(u)}"></div>' for u in r["extra"])
        r["body"] = (r["body"] or "") + blocks
        report["lessons_with_extra_videos"] += 1

# Slugs únicos por curso
seen = collections.defaultdict(set)
for r in lesson_rows:
    s = slugify(r["slug"] or r["title"])
    base, n = s, 2
    while s in seen[r["course"]]:
        s = f"{base}-{n}"; n += 1
    seen[r["course"]].add(s)
    r["slug"] = s

# ---------------------------------------------------------------- SQL compacto
def values(rows):
    return ",".join("(" + ",".join(q(v) for v in r) + ")" for r in rows)


def chunks(rows, size):
    for i in range(0, len(rows), size):
        yield rows[i:i + size]


content = []
crow = []
for c in courses:
    cid = int(c["id"])
    desc = S(c["content"]) if re.sub(r"<[^>]+>|<!--.*?-->|\s", "", S(c["content"]), flags=re.S) else None
    crow.append((c["slug"], html.unescape(c["title"]).replace(" - Cyberespiración", ""), desc, "published", course_order.get(str(cid), 9), cid))
content.append("INSERT INTO courses (slug,title,description_html,status,position,wp_id) VALUES "
               + values(crow).replace("'published'", "'published'::content_status") + ";")

mrow = [(m["course"], m["title"], m["pos"], m["wp"]) for m in module_rows]
content.append("INSERT INTO modules (course_id,title,position,wp_id) SELECT c.id, v.t, v.p, v.w FROM (VALUES "
               + values(mrow) + ") v(c,t,p,w) JOIN courses c ON c.wp_id=v.c;")

for part in chunks(lesson_rows, 40):
    rows = [(r["course"], r["module"] if isinstance(r["module"], int) else None, r["slug"], r["title"], r["body"], r["video"], r["pos"], r["wp"]) for r in part]
    content.append(
        "INSERT INTO lessons (course_id,module_id,slug,title,body_html,video_url,position,wp_id) "
        "SELECT c.id, m.id, v.s, v.t, v.b, v.vu, v.p, v.w FROM (VALUES " + values(rows).replace("NULL", "NULL::int", 0) +
        ") v(c,mw,s,t,b,vu,p,w) JOIN courses c ON c.wp_id=v.c "
        "JOIN modules m ON m.course_id=c.id AND m.wp_id IS NOT DISTINCT FROM v.mw::int;")

used_media = sorted({mid for _, mid, _ in lesson_assets})
arow = []
for mid in used_media:
    m = media_by_id[mid]
    arow.append(("audio" if m["mime"] == "audio/mpeg" else "pdf", storage_path(m), html.unescape(m["title"]), m["mime"], int(m["filesize"] or 0), mid))
content.append("INSERT INTO assets (kind,storage_path,title,mime,size_bytes,wp_id) SELECT v.k::asset_kind, v.s, v.t, v.m, v.z, v.w FROM (VALUES "
               + values(arow) + ") v(k,s,t,m,z,w);")
content.append("INSERT INTO lesson_assets (lesson_id,asset_id,position) SELECT l.id, a.id, v.p FROM (VALUES "
               + values(lesson_assets) + ") v(l,a,p) JOIN lessons l ON l.wp_id=v.l JOIN assets a ON a.wp_id=v.a ON CONFLICT DO NOTHING;")

products = [
    (457, "cocreacion-pago-unico", "La CoCreación · pago único", 75000, 1, 223),
    (438, "cocreacion-2-meses", "La CoCreación · 2 meses", 38700, 2, 223),
    (423, "cocreacion-3-meses", "La CoCreación · 3 meses", 28400, 3, 223),
    (463, "master", "Master Cyberespiración", 200000, 1, 233),
    (466, "renacimiento-pago-unico", "Renacimiento Celular · pago único", 30000, 1, 690),
    (465, "renacimiento-2-meses", "Renacimiento Celular · 2 meses", 15800, 2, 690),
    (464, "renacimiento-3-meses", "Renacimiento Celular · 3 meses", 13000, 3, 690),
]
content.append("INSERT INTO products (slug,name,price_cents,installments,active,wp_id) VALUES "
               + values([(s_, n, c_, i, False, w) for w, s_, n, c_, i, _ in products]) + ";")
content.append("INSERT INTO product_courses (product_id,course_id) SELECT p.id, c.id FROM (VALUES "
               + values([(w, cid) for w, *_, cid in products]) + ") v(p,c) JOIN products p ON p.wp_id=v.p JOIN courses c ON c.wp_id=v.c;")

# ---------------------------------------------------------------- personas
people = []
users = mysql(
    "SELECT u.ID, u.user_email, u.display_name, u.user_registered, "
    "(SELECT meta_value FROM wp_usermeta WHERE user_id=u.ID AND meta_key='wp_capabilities') FROM wp_users u"
)
urows = []
for wid, email, name, reg, caps in users:
    role = "admin" if "administrator" in (caps or "") else "student"
    urows.append((secrets.token_urlsafe(18), name.strip() or email.split("@")[0], email.strip().lower(), role, int(wid), reg + "+00"))
    report["admins" if role == "admin" else "students"] += 1
people.append('INSERT INTO "user" (id,name,email,email_verified,role,wp_id,created_at) SELECT v.i, v.n, v.e, TRUE, v.r, v.w, v.c::timestamptz FROM (VALUES '
              + values(urows) + ") v(i,n,e,r,w,c);")

access = mysql(
    "SELECT user_id, REPLACE(REPLACE(meta_key,'course_',''),'_access_from',''), meta_value FROM wp_usermeta "
    "WHERE meta_key IN ('course_223_access_from','course_233_access_from','course_690_access_from')"
)
erows = [(int(w), int(c), int(t)) for w, c, t in access]
report["enrollments"] = len(erows)
people.append("INSERT INTO enrollments (user_id,course_id,source,granted_at) SELECT u.id, c.id, 'migration', to_timestamp(v.t) FROM (VALUES "
              + values(erows) + ") v(u,c,t) JOIN \"user\" u ON u.wp_id=v.u JOIN courses c ON c.wp_id=v.c ON CONFLICT DO NOTHING;")

lesson_wps = {r["wp"] for r in lesson_rows}
done = mysql(
    "SELECT user_id, post_id, IFNULL(MAX(activity_completed),0) FROM wp_learndash_user_activity "
    "WHERE activity_type IN ('topic','lesson') AND activity_status=1 GROUP BY user_id, post_id"
)
prow = [(int(w), int(p_), int(t or 0)) for w, p_, t in done if int(p_) in lesson_wps]
report["progress_rows"] = len(prow)
report["progress_skipped"] = len(done) - len(prow)
for part in chunks(prow, 450):
    people.append("INSERT INTO lesson_progress (user_id,lesson_id,completed_at) SELECT u.id, l.id, CASE WHEN v.t>0 THEN to_timestamp(v.t) ELSE now() END FROM (VALUES "
                  + values(part) + ") v(u,l,t) JOIN \"user\" u ON u.wp_id=v.u JOIN lessons l ON l.wp_id=v.l ON CONFLICT DO NOTHING;")

json.dump({"content": content, "people": people}, open(OUT, "w"), ensure_ascii=False)
report.update(courses=len(courses), modules=len(module_rows), lessons=len(lesson_rows), assets=len(used_media),
              lesson_assets=len(lesson_assets), lessons_without_video=sum(1 for r in lesson_rows if not r["video"]))
print(dict(report))
print("content stmts chars:", [len(x) for x in content])
print("people stmts chars:", [len(x) for x in people])
