#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


PACK_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACK_ROOT.parents[1]
MANIFEST_PATH = PACK_ROOT / "manifest.json"
COPY_PATH = PACK_ROOT / "copy" / "locales.json"
FEATURE_MASTER_PATH = PACK_ROOT / "source" / "feature-graphic-master.png"

INTER_REGULAR = REPO_ROOT / "node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf"
INTER_SEMIBOLD = REPO_ROOT / "node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf"
INTER_BOLD = REPO_ROOT / "node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf"

LOCALE_FONTS = {
    "ar-sa": Path("/System/Library/Fonts/SFArabic.ttf"),
    "ar-ae": Path("/System/Library/Fonts/SFArabic.ttf"),
    "zh": Path("/System/Library/Fonts/STHeiti Medium.ttc"),
    "ko": Path("/System/Library/Fonts/AppleSDGothicNeo.ttc"),
}

STORY_KEYS = {
    "welcome": ("premiumStoryWelcomeTitle", "premiumStoryWelcomeBody"),
    "budget": ("premiumStoryBudgetTitle", "premiumStoryBudgetBody"),
    "insights": ("premiumStoryInsightsTitle", "premiumStoryInsightsBody"),
    "impulse": ("premiumStoryImpulseTitle", "premiumStoryImpulseBody"),
    "unlimited": ("premiumStoryUnlimitedTitle", "premiumStoryUnlimitedBody"),
    "ready": ("premiumStoryReadyTitle", "premiumStoryReadyBody"),
}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_translations():
    generated_source = (REPO_ROOT / "src/constants/translations.generated.js").read_text(encoding="utf-8")
    generated_json = re.sub(r"^export const GENERATED_TRANSLATIONS =\s*", "", generated_source)
    generated_json = re.sub(r";\s*$", "", generated_json)
    bundles = json.loads(generated_json)

    main_source = (REPO_ROOT / "src/constants/translations.js").read_text(encoding="utf-8")
    locale_matches = list(
        re.finditer(r"^  (?:},\s*)?(ru|en|fr|es): \{$", main_source, re.MULTILINE)
    )
    for index, match in enumerate(locale_matches):
        locale = match.group(1)
        end = locale_matches[index + 1].start() if index + 1 < len(locale_matches) else main_source.find("\n};", match.end())
        segment = main_source[match.end():end]
        selected = {}
        requested_keys = {"premiumStoryBadge", "premiumStoryStart"}
        for title_key, body_key in STORY_KEYS.values():
            requested_keys.update((title_key, body_key))
        for key in requested_keys:
            value_match = re.search(
                rf'^    {re.escape(key)}:\s*"((?:\\.|[^"\\])*)",\s*$',
                segment,
                re.MULTILINE,
            )
            if value_match:
                selected[key] = json.loads(f'"{value_match.group(1)}"')
        bundles[locale] = selected
    return bundles


def translation_bundle_for_locale(bundles, locale: str):
    source_locale = "ar" if locale.startswith("ar-") else locale
    if source_locale not in bundles:
        raise KeyError(f"Missing translation bundle for {locale} -> {source_locale}")
    return bundles[source_locale]


def locale_font(locale: str, size: int, weight: str = "regular"):
    locale_path = LOCALE_FONTS.get(locale)
    if locale_path and locale_path.exists():
        return ImageFont.truetype(str(locale_path), size=size)
    path = INTER_BOLD if weight == "bold" else INTER_SEMIBOLD if weight == "semibold" else INTER_REGULAR
    return ImageFont.truetype(str(path), size=size)


def is_rtl(locale: str):
    return locale.startswith("ar-")


def text_width(draw: ImageDraw.ImageDraw, text: str, font, locale: str):
    kwargs = {"direction": "rtl", "language": "ar"} if is_rtl(locale) else {}
    bbox = draw.textbbox((0, 0), text, font=font, **kwargs)
    return bbox[2] - bbox[0]


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font, max_width: int, locale: str):
    if locale == "zh":
        tokens = list(text)
        joiner = ""
    else:
        tokens = text.split()
        joiner = " "
    lines = []
    current = ""
    for token in tokens:
        candidate = token if not current else current + joiner + token
        if current and text_width(draw, candidate, font, locale) > max_width:
            lines.append(current)
            current = token
        else:
            current = candidate
    if current:
        lines.append(current)
    return "\n".join(lines)


def rounded_image(image: Image.Image, size, radius: int):
    fitted = ImageOps.fit(image.convert("RGB"), size, method=Image.Resampling.LANCZOS)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    result = Image.new("RGBA", size, (0, 0, 0, 0))
    result.paste(fitted.convert("RGBA"), (0, 0), mask)
    return result


def vertical_gradient(size, top, bottom):
    width, height = size
    image = Image.new("RGB", size)
    pixels = image.load()
    for y in range(height):
        ratio = y / max(1, height - 1)
        color = tuple(round(top[i] * (1 - ratio) + bottom[i] * ratio) for i in range(3))
        for x in range(width):
            pixels[x, y] = color
    return image


def draw_centered_multiline(draw, text, center_x, top_y, font, fill, spacing, locale, max_width):
    wrapped = wrap_text(draw, text, font, max_width, locale)
    kwargs = {"direction": "rtl", "language": "ar"} if is_rtl(locale) else {}
    bbox = draw.multiline_textbbox((0, 0), wrapped, font=font, spacing=spacing, align="center", **kwargs)
    text_height = bbox[3] - bbox[1]
    draw.multiline_text(
        (center_x, top_y),
        wrapped,
        font=font,
        fill=fill,
        spacing=spacing,
        align="center",
        anchor="ma",
        **kwargs,
    )
    return text_height


def render_story(locale: str, title: str, body: str, badge: str, cta: str, art_path: Path, size, draw_copy=True):
    width, height = size
    base = vertical_gradient(size, (246, 244, 255), (226, 234, 255))
    art = Image.open(art_path).convert("RGB")

    background_art = ImageOps.fit(art, size, method=Image.Resampling.LANCZOS).filter(
        ImageFilter.GaussianBlur(radius=max(18, width // 48))
    )
    background_art.putalpha(34)
    base = base.convert("RGBA")
    base.alpha_composite(background_art)

    draw = ImageDraw.Draw(base)
    margin = round(width * 0.075)
    title_font = locale_font(locale, max(44, round(width * 0.064)), "bold")
    body_font = locale_font(locale, max(25, round(width * 0.029)), "regular")
    badge_font = locale_font(locale, max(18, round(width * 0.021)), "semibold")
    cta_font = locale_font(locale, max(22, round(width * 0.027)), "semibold")

    draw.rounded_rectangle(
        (margin, round(height * 0.045), width - margin, round(height * 0.118)),
        radius=round(width * 0.04),
        fill=(255, 255, 255, 210),
        outline=(216, 207, 246, 220),
        width=max(2, width // 500),
    )
    badge_kwargs = {"direction": "rtl", "language": "ar"} if is_rtl(locale) else {}
    if draw_copy:
        draw.text(
            (width // 2, round(height * 0.081)),
            f"{badge}  ·  7.0.1",
            font=badge_font,
            fill=(80, 62, 145),
            anchor="mm",
            **badge_kwargs,
        )

    title_top = round(height * 0.15)
    title_height = 0
    if draw_copy:
        title_height = draw_centered_multiline(
            draw,
            title,
            width // 2,
            title_top,
            title_font,
            (31, 28, 52),
            max(8, width // 100),
            locale,
            round(width * 0.82),
        )

    card_top = max(round(height * 0.31), title_top + title_height + round(height * 0.035))
    card_bottom = round(height * 0.925)
    card_box = (margin, card_top, width - margin, card_bottom)
    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (card_box[0], card_box[1] + round(height * 0.012), card_box[2], card_box[3] + round(height * 0.012)),
        radius=round(width * 0.055),
        fill=(62, 47, 105, 45),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=max(10, width // 50)))
    base.alpha_composite(shadow)
    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle(card_box, radius=round(width * 0.055), fill=(255, 255, 255, 245))

    inner_x = card_box[0] + round(width * 0.045)
    inner_width = card_box[2] - card_box[0] - round(width * 0.09)
    progress_y = card_top + round(height * 0.022)
    gap = max(5, round(width * 0.008))
    segment_width = (inner_width - gap * 5) // 6
    for index in range(6):
        x0 = inner_x + index * (segment_width + gap)
        fill = (113, 78, 224, 255) if index <= 1 else (224, 222, 235, 255)
        draw.rounded_rectangle(
            (x0, progress_y, x0 + segment_width, progress_y + max(5, round(height * 0.004))),
            radius=max(3, width // 300),
            fill=fill,
        )

    art_top = progress_y + round(height * 0.025)
    art_height = round((card_bottom - card_top) * 0.56)
    art_render = rounded_image(art, (inner_width, art_height), radius=round(width * 0.035))
    base.alpha_composite(art_render, (inner_x, art_top))

    body_top = art_top + art_height + round(height * 0.027)
    body_height = 0
    if draw_copy:
        body_height = draw_centered_multiline(
            draw,
            body,
            width // 2,
            body_top,
            body_font,
            (83, 80, 101),
            max(7, width // 140),
            locale,
            round(inner_width * 0.88),
        )

    button_height = round(height * 0.052)
    button_width = min(round(width * 0.47), inner_width)
    button_bottom_anchor = card_bottom - button_height - round(height * 0.025)
    button_top = (
        min(button_bottom_anchor, body_top + body_height + round(height * 0.027))
        if draw_copy
        else button_bottom_anchor
    )
    button_box = (
        width // 2 - button_width // 2,
        button_top,
        width // 2 + button_width // 2,
        button_top + button_height,
    )
    draw.rounded_rectangle(button_box, radius=button_height // 2, fill=(107, 73, 219, 255))
    if draw_copy:
        draw.text(
            (width // 2, button_top + button_height // 2),
            cta,
            font=cta_font,
            fill=(255, 255, 255),
            anchor="mm",
            **badge_kwargs,
        )
    return base.convert("RGB")


def fit_feature_graphic(master: Image.Image):
    return ImageOps.fit(master.convert("RGB"), (1024, 500), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def export_metadata(manifest, copy):
    exports_dir = PACK_ROOT / "exports"
    exports_dir.mkdir(parents=True, exist_ok=True)
    app_store_fields = ["source_locale", "store_locale", "name", "subtitle", "promotional_text", "keywords", "description", "whats_new"]
    google_fields = ["source_locale", "store_locale", "title", "short_description", "full_description", "release_notes", "feature_graphic_alt"]
    with (exports_dir / "app-store-metadata.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=app_store_fields)
        writer.writeheader()
        for locale in manifest["source_locales"]:
            row = {"source_locale": locale, "store_locale": manifest["store_locale_mapping"][locale]["app_store"]}
            row.update(copy[locale]["app_store"])
            writer.writerow(row)
    with (exports_dir / "google-play-metadata.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=google_fields)
        writer.writeheader()
        for locale in manifest["source_locales"]:
            row = {"source_locale": locale, "store_locale": manifest["store_locale_mapping"][locale]["google_play"]}
            row.update(copy[locale]["google_play"])
            writer.writerow(row)
    release_lines = []
    for locale in manifest["source_locales"]:
        store_locale = manifest["store_locale_mapping"][locale]["google_play"]
        release_lines.extend((f"<{store_locale}>", copy[locale]["google_play"]["release_notes"], f"</{store_locale}>", ""))
    (exports_dir / "google-play-release-notes.txt").write_text("\n".join(release_lines).rstrip() + "\n", encoding="utf-8")


def validate_copy(manifest, copy):
    report = {"version": manifest["app"]["version"], "locales": {}, "errors": []}
    for locale in manifest["source_locales"]:
        apple = copy[locale]["app_store"]
        google = copy[locale]["google_play"]
        checks = {
            "app_store_name_chars": len(apple["name"]),
            "app_store_subtitle_chars": len(apple["subtitle"]),
            "app_store_promotional_text_chars": len(apple["promotional_text"]),
            "app_store_keywords_bytes": len(apple["keywords"].encode("utf-8")),
            "app_store_description_chars": len(apple["description"]),
            "app_store_whats_new_chars": len(apple["whats_new"]),
            "google_title_chars": len(google["title"]),
            "google_short_description_chars": len(google["short_description"]),
            "google_full_description_chars": len(google["full_description"]),
            "google_release_notes_chars": len(google["release_notes"]),
            "google_feature_alt_chars": len(google["feature_graphic_alt"]),
        }
        report["locales"][locale] = checks
        limits = {
            "app_store_name_chars": 30,
            "app_store_subtitle_chars": 30,
            "app_store_promotional_text_chars": 170,
            "app_store_keywords_bytes": 100,
            "app_store_description_chars": 4000,
            "app_store_whats_new_chars": 4000,
            "google_title_chars": 30,
            "google_short_description_chars": 80,
            "google_full_description_chars": 4000,
            "google_release_notes_chars": 500,
            "google_feature_alt_chars": 140,
        }
        for key, limit in limits.items():
            if checks[key] > limit:
                report["errors"].append(f"{locale}: {key} is {checks[key]}, limit {limit}")
    return report


def validate_assets(manifest, report):
    expected = {
        "app_store_iphone_6_9": (1290, 2796),
        "app_store_ipad_13": (2048, 2732),
        "google_play_phone": (1080, 1920),
    }
    for locale in manifest["source_locales"]:
        for format_key, size in expected.items():
            base_dir = {
                "app_store_iphone_6_9": PACK_ROOT / "visuals/app-store/iphone-6.9" / locale,
                "app_store_ipad_13": PACK_ROOT / "visuals/app-store/ipad-13" / locale,
                "google_play_phone": PACK_ROOT / "visuals/google-play/phone" / locale,
            }[format_key]
            for scene in manifest["screenshots"]:
                path = base_dir / f"{scene['id']}.jpg"
                if not path.exists():
                    report["errors"].append(f"Missing asset: {path.relative_to(PACK_ROOT)}")
                    continue
                with Image.open(path) as image:
                    if image.size != size:
                        report["errors"].append(f"Wrong size for {path.relative_to(PACK_ROOT)}: {image.size}, expected {size}")
                    if image.mode != "RGB":
                        report["errors"].append(f"Wrong mode for {path.relative_to(PACK_ROOT)}: {image.mode}, expected RGB")
    feature_path = PACK_ROOT / "visuals/google-play/feature-graphic.jpg"
    icon_path = PACK_ROOT / "visuals/google-play/icon.png"
    for path, expected_size in ((feature_path, (1024, 500)), (icon_path, (512, 512))):
        if not path.exists():
            report["errors"].append(f"Missing asset: {path.relative_to(PACK_ROOT)}")
            continue
        with Image.open(path) as image:
            if image.size != expected_size:
                report["errors"].append(f"Wrong size for {path.relative_to(PACK_ROOT)}: {image.size}, expected {expected_size}")


def main():
    manifest = load_json(MANIFEST_PATH)
    copy = load_json(COPY_PATH)
    if "--validate-only" in sys.argv:
        export_metadata(manifest, copy)
        report = validate_copy(manifest, copy)
        validate_assets(manifest, report)
        report["status"] = "pass" if not report["errors"] else "fail"
        (PACK_ROOT / "validation-report.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        if report["errors"]:
            raise SystemExit("\n".join(report["errors"]))
        return
    bundles = load_translations()
    if not FEATURE_MASTER_PATH.exists():
        raise FileNotFoundError(f"Missing imagegen master at {FEATURE_MASTER_PATH}")

    visuals_dir = PACK_ROOT / "visuals"
    visuals_dir.mkdir(parents=True, exist_ok=True)
    feature = fit_feature_graphic(Image.open(FEATURE_MASTER_PATH))
    feature_path = visuals_dir / "google-play/feature-graphic.jpg"
    feature_path.parent.mkdir(parents=True, exist_ok=True)
    feature.save(feature_path, "JPEG", quality=92, optimize=True, progressive=True)

    icon = Image.open(REPO_ROOT / "assets/Almost_icon.png").convert("RGBA")
    icon = ImageOps.fit(icon, (512, 512), method=Image.Resampling.LANCZOS)
    icon.save(visuals_dir / "google-play/icon.png", "PNG", optimize=True)

    formats = {
        "app-store/iphone-6.9": (1290, 2796),
        "app-store/ipad-13": (2048, 2732),
        "google-play/phone": (1080, 1920),
    }
    rtl_jobs = []
    for locale in manifest["source_locales"]:
        bundle = translation_bundle_for_locale(bundles, locale)
        badge = bundle["premiumStoryBadge"]
        cta = bundle["premiumStoryStart"]
        for scene in manifest["screenshots"]:
            title_key, body_key = STORY_KEYS[scene["story"]]
            title = bundle[title_key]
            body = bundle[body_key]
            art_path = REPO_ROOT / scene["art"]
            for format_dir, size in formats.items():
                output_dir = visuals_dir / format_dir / locale
                output_dir.mkdir(parents=True, exist_ok=True)
                output_path = output_dir / f"{scene['id']}.jpg"
                if locale.startswith("ar-"):
                    rendered = render_story("en", "", "", "", "", art_path, size, draw_copy=False)
                    rtl_jobs.append(
                        {
                            "path": str(output_path),
                            "width": size[0],
                            "height": size[1],
                            "title": title,
                            "body": body,
                            "badge": badge,
                            "cta": cta,
                        }
                    )
                else:
                    rendered = render_story(locale, title, body, badge, cta, art_path, size)
                rendered.save(output_path, "JPEG", quality=88, optimize=True, progressive=True, subsampling=1)

    rtl_jobs_path = PACK_ROOT / "source" / "rtl-render-jobs.json"
    rtl_jobs_path.write_text(json.dumps(rtl_jobs, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    subprocess.run(
        ["xcrun", "swift", str(PACK_ROOT / "scripts/render_rtl.swift"), str(rtl_jobs_path)],
        cwd=REPO_ROOT,
        check=True,
    )

    export_metadata(manifest, copy)
    report = validate_copy(manifest, copy)
    validate_assets(manifest, report)
    report["status"] = "pass" if not report["errors"] else "fail"
    (PACK_ROOT / "validation-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    if report["errors"]:
        raise SystemExit("\n".join(report["errors"]))


if __name__ == "__main__":
    main()
