"""Seed realistic demo accounts. Idempotent — skips existing emails.

Run:  backend\\.venv\\Scripts\\python.exe backend\\scripts\\seed_users.py
All seeded accounts share the password printed at the bottom.
Admin cannot be created via signup; it exists only through this seed.
"""

import base64
import io
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal, User  # noqa: E402
from app.auth import hash_password  # noqa: E402

PASSWORD = "demo1234"


def make_signature(name: str) -> str:
    """Draw a simple handwritten-style placeholder signature as a PNG data URL."""
    from PIL import Image, ImageDraw

    img = Image.new("RGBA", (480, 160), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    # A flowing underline squiggle + initials, clearly a stand-in signature.
    initials = "".join(w[0] for w in name.split()[:3]).upper()
    draw.line(
        [(40 + i * 3, 110 - int(18 * abs(((i * 7) % 23) - 11)) ) for i in range(120)],
        fill=(20, 30, 90, 230),
        width=5,
    )
    draw.text((60, 40), f"{initials}.", fill=(15, 15, 60, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


USERS = [
    # --- admin ---
    ("admin@usar.ac.in", "Dev Admin", "admin", "Institute IT Cell", "Platform Developer", True),
    # --- deans ---
    ("sunita.deshmukh@usar.ac.in", "Prof. Sunita Deshmukh", "dean", "Academic Affairs", "Dean of Academics", True),
    ("arvind.menon@usar.ac.in", "Dr. Arvind Menon", "dean", "Research & Development", "Director, Research", True),
    # --- profs ---
    ("ananya.sharma@usar.ac.in", "Dr. Ananya Sharma", "prof", "Computer Science & Engineering", "Head of Department", True),
    ("rajesh.iyer@usar.ac.in", "Dr. Rajesh Iyer", "prof", "Electronics & Communication", "Professor", True),
    ("meera.krishnan@usar.ac.in", "Dr. Meera Krishnan", "prof", "Mechanical Engineering", "Associate Professor", True),
    ("vikram.sethi@usar.ac.in", "Dr. Vikram Sethi", "prof", "Civil Engineering", "Head of Department", True),
    # --- students ---
    ("aarav.gupta@student.usar.ac.in", "Aarav Gupta", "student", "Computer Science & Engineering", "B.Tech CSE, 3rd Year", False),
    ("ishita.rao@student.usar.ac.in", "Ishita Rao", "student", "Electronics & Communication", "B.Tech ECE, 2nd Year", False),
    ("kabir.malhotra@student.usar.ac.in", "Kabir Malhotra", "student", "Mechanical Engineering", "B.Tech ME, 4th Year", False),
    # --- club leads ---
    ("rohan.verma@usar.ac.in", "Rohan Verma", "club_lead", "Music Club", "Club Lead 2026-27", True),
    ("priya.nair@usar.ac.in", "Priya Nair", "club_lead", "Robotics Club", "Club Lead 2026-27", True),
]


def main() -> None:
    db = SessionLocal()
    created, skipped = [], []
    for email, name, role, dept, position, needs_signature in USERS:
        if db.query(User).filter(User.email == email).first():
            skipped.append(email)
            continue
        user = User(
            email=email,
            name=name,
            password_hash=hash_password(PASSWORD),
            role=role,
            department=dept,
            position=position,
            signature_png=make_signature(name) if needs_signature else None,
        )
        db.add(user)
        db.commit()
        created.append(f"{email} [{role}]")
    db.close()
    print(f"created {len(created)}:")
    for c in created:
        print("  ", c)
    for s in skipped:
        print("skipped (exists):", s)
    print(f"\nPassword for ALL seeded accounts: {PASSWORD}")


if __name__ == "__main__":
    main()
