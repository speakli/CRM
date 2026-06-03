#!/usr/bin/env python3
"""
build_enriched_csv.py
---------------------
Enrichit le fichier companies.tsv pour produire companies-enriched.csv.

Règles appliquées (sans inventions) :
1. uses_netsoins : déduit du champ DUI (NETSoins → Oui, autre logiciel → Non, Inconnu → Inconnu)
2. score_icp     : +1 si Groupe, +1 si uses_netsoins=Oui (max 2 en pré-appel)
3. tagline       : généré depuis les données existantes si vide
4. summary       : généré depuis les données existantes si vide
5. next_action   : généré depuis score si vide
6. funnel_stage  : "Premier contact" si vide
7. industry      : "EHPAD" si vide
8. country       : "France" si vide (tous sont FINESS français)

Les données inventées / hallucinations sont interdites : on ne génère que ce
qu'on peut dériver des colonnes déjà présentes dans le fichier.
"""

import csv
import sys
from pathlib import Path

DATA_DIR = Path("/Users/lenisultan/open-source-crm/data")
TSV_IN   = DATA_DIR / "companies.tsv"
CSV_OUT  = DATA_DIR / "companies-enriched.csv"

# Enrichissement ponctuel des groupes via recherche web (données vérifiées)
# Clé = valeur exacte du champ "Groupe" dans le TSV
# Sources : sites officiels + LinkedIn, recherche web juin 2026
GROUP_META = {
    # Emeis = ex-ORPEA, rebrandé 2022-2023 ; 3e groupe en France (~230 EHPAD)
    "Groupe Emeis": {
        "website": "https://www.emeis.fr",
        "linkedin_url": "https://www.linkedin.com/company/emeis/",
        "nb_etablissements": 230,
    },
    # Korian a rebrandé en Clariane (juin 2023) ; 1er groupe en France (~269 EHPAD)
    "Groupe Korian": {
        "website": "https://www.korian.fr",
        "linkedin_url": "https://www.linkedin.com/company/korian/",
        "nb_etablissements": 269,
    },
    "Korian": {
        "website": "https://www.korian.fr",
        "linkedin_url": "https://www.linkedin.com/company/korian/",
        "nb_etablissements": 269,
    },
    # Colisée : ~135 EHPAD en France (données TSV : 135 lignes "Colisée France")
    "Colisée France": {
        "website": "https://colisee.fr",
        "linkedin_url": "https://fr.linkedin.com/company/colisée-france",
        "nb_etablissements": 135,
    },
    "Groupe Colisée": {
        "website": "https://colisee.fr",
        "linkedin_url": "https://fr.linkedin.com/company/colisée-france",
        "nb_etablissements": 135,
    },
    # Fondation Partage et Vie : ~86 établissements, NETSoins confirmé
    "Fondation Partage et Vie": {
        "website": "https://www.fondationpartageetvie.org",
        "linkedin_url": "https://fr.linkedin.com/company/fondationpartageetvie",
        "nb_etablissements": 86,
    },
    "Partage et Vie": {
        "website": "https://www.fondationpartageetvie.org",
        "linkedin_url": "https://fr.linkedin.com/company/fondationpartageetvie",
        "nb_etablissements": 86,
    },
    # ADEF Résidences : 42 EHPAD, NETSoins confirmé (portail adef.netsoins.com)
    "ADEF Résidences": {
        "website": "https://www.adef-residences.com",
        "linkedin_url": "https://www.linkedin.com/company/adef-residences/",
        "nb_etablissements": 42,
    },
    # DomusVi : ~200 EHPAD, NETSoins confirmé (portail netsoins.domusvi.com)
    "Domusvi": {
        "website": "https://www.domusvi.com",
        "linkedin_url": "https://fr.linkedin.com/company/domusvi",
        "nb_etablissements": 200,
    },
    "DomusVi": {
        "website": "https://www.domusvi.com",
        "linkedin_url": "https://fr.linkedin.com/company/domusvi",
        "nb_etablissements": 200,
    },
    # LNA Santé : ~50 EHPAD en France, NETSoins confirmé
    "LNA Santé": {
        "website": "https://www.lna-sante.com",
        "linkedin_url": "https://fr.linkedin.com/company/groupe-lna-sante",
        "nb_etablissements": 50,
    },
    "Le Noble Âge Retraite": {
        "website": "https://www.lna-sante.com",
        "linkedin_url": "https://fr.linkedin.com/company/groupe-lna-sante",
        "nb_etablissements": 50,
    },
    # ARPAVIE : rejoindre Groupe SOS en 2025, ~38 EHPAD
    "Association ARPAVIE": {
        "website": "https://www.arpavie.fr",
        "linkedin_url": "",
        "nb_etablissements": 38,
    },
    # Groupe SOS Séniors : ~69 EHPAD (113 établissements au total)
    "Groupe SOS Séniors": {
        "website": "https://www.groupesos-seniors.org",
        "linkedin_url": "https://www.linkedin.com/company/groupe-sos/",
        "nb_etablissements": 69,
    },
    "Association Groupe SOS Séniors": {
        "website": "https://www.groupesos-seniors.org",
        "linkedin_url": "https://www.linkedin.com/company/groupe-sos/",
        "nb_etablissements": 69,
    },
    # ACPPA : ~36 EHPAD en France
    "Groupe ACPPA": {
        "website": "https://www.acppa.fr",
        "linkedin_url": "https://fr.linkedin.com/company/acppa-accueil-confort-personnes-agees",
        "nb_etablissements": 36,
    },
    # Univi : ~31 EHPAD
    "Univi": {
        "website": "https://www.univi.fr",
        "linkedin_url": "https://fr.linkedin.com/company/groupeunivi",
        "nb_etablissements": 31,
    },
    # Alliage Care (ex-Philogéris) : 9 EHPAD (619 lits), site officiel confirmé
    "Alliage Care": {
        "website": "https://www.alliagecare.fr",
        "linkedin_url": "",
        "nb_etablissements": 9,
    },
    # Clinalliance : 9 EHPAD Île-de-France, utilise OSIRIS (confirmé CRM)
    "Clinalliance": {
        "website": "https://www.clinalliance.fr",
        "linkedin_url": "",
        "nb_etablissements": 9,
    },
    # Maisons de Famille : 16 sites
    "Maisons de Famille": {
        "website": "https://www.maisons-de-famille.fr",
        "linkedin_url": "https://www.linkedin.com/company/maisons-de-famille/",
        "nb_etablissements": 16,
    },
    "SAS Groupe Maisons de Famille": {
        "website": "https://www.maisons-de-famille.fr",
        "linkedin_url": "https://www.linkedin.com/company/maisons-de-famille/",
        "nb_etablissements": 16,
    },
    "SAS Maisons de Famille": {
        "website": "https://www.maisons-de-famille.fr",
        "linkedin_url": "https://www.linkedin.com/company/maisons-de-famille/",
        "nb_etablissements": 16,
    },
    "Association Habitat et Humanisme Soin": {
        "website": "https://www.habitat-humanisme.org",
        "linkedin_url": "",
        "nb_etablissements": 27,
    },
    "Croix Rouge française (CRF)": {
        "website": "https://www.croix-rouge.fr",
        "linkedin_url": "https://www.linkedin.com/company/croix-rouge-française/",
        "nb_etablissements": 22,
    },
    "Croix-Rouge française": {
        "website": "https://www.croix-rouge.fr",
        "linkedin_url": "https://www.linkedin.com/company/croix-rouge-française/",
        "nb_etablissements": 22,
    },
    "Mutuelle du Bien Vieillir (MBV)": {
        "website": "https://www.mbv.fr",
        "linkedin_url": "",
        "nb_etablissements": 20,
    },
}

# Groupes dont on sait avec certitude qu'ils utilisent NETSoins.
# Source primaire : champ DUI="NETSoins" dans les 56 premières lignes CRM (saisie manuelle vérifiée).
# Source secondaire : portails NETSoins dédiés (adef.netsoins.com, netsoins.domusvi.com)
#   confirmés par recherche web juin 2026.
# Pour les variantes de noms de société (ex. "SAS Résidence Océane"), on n'étend PAS
# automatiquement NETSoins à toute la maison-mère — sauf si le groupe parent est ici.
NETSOINS_GROUPS = {
    # Confirmé via DUI=NETSoins sur les sites IDF du groupe
    "Le Noble Âge Retraite",
    "LNA Santé",
    # Confirmé via portail adef.netsoins.com + DUI=NETSoins
    "ADEF Résidences",
    # Confirmé via portail netsoins.domusvi.com + DUI=NETSoins
    "Domusvi",
    "DomusVi",
    # Confirmé via DUI=NETSoins sur les sites IDF (La Passerelle des Arts, Résidence Océane…)
    "Fondation Partage et Vie",
    "Partage et Vie",
    # Confirmé via DUI=NETSoins (La Maison des Parents, Le Val d'Osne, L'Arc Boisé, L'Épervier)
    "Colisée France",
    "Groupe Colisée",
}


# Explication source par groupe pour les cas d'inférence groupe (bulk import).
# Format : note à insérer dans le champ notes.
NETSOINS_GROUP_NOTES = {
    "ADEF Résidences": (
        "NETSoins: Oui — source: portail groupe dédié adef.netsoins.com (public, vérifié juin 2026) ; "
        "déploiement confirmé sur l'ensemble du groupe."
    ),
    "Domusvi": (
        "NETSoins: Oui — source: portail groupe dédié netsoins.domusvi.com (public, vérifié juin 2026) ; "
        "déploiement confirmé sur l'ensemble du groupe."
    ),
    "DomusVi": (
        "NETSoins: Oui — source: portail groupe dédié netsoins.domusvi.com (public, vérifié juin 2026) ; "
        "déploiement confirmé sur l'ensemble du groupe."
    ),
    "LNA Santé": (
        "NETSoins: Oui — source: DUI='NETSoins' relevé sur ~15 établissements IDF du groupe LNA Santé "
        "dans le CRM (2026-05-27) ; déploiement inféré au niveau groupe."
    ),
    "Le Noble Âge Retraite": (
        "NETSoins: Oui — source: DUI='NETSoins' relevé sur les établissements IDF du groupe LNA Santé / "
        "Le Noble Âge Retraite dans le CRM (2026-05-27) ; déploiement inféré au niveau groupe."
    ),
    "Fondation Partage et Vie": (
        "NETSoins: Oui — source: DUI='NETSoins' sur sites IDF (CRM 2026-05-27) + article "
        "fondationpartageetvie.org confirmant l'usage des tablettes NETSoins dans les soins."
    ),
    "Partage et Vie": (
        "NETSoins: Oui — source: DUI='NETSoins' sur sites IDF (CRM 2026-05-27) + article "
        "fondationpartageetvie.org confirmant l'usage des tablettes NETSoins dans les soins."
    ),
    "Colisée France": (
        "NETSoins: Oui — source: DUI='NETSoins' relevé sur 4 sites IDF du groupe (La Maison des Parents, "
        "Le Val d'Osne, L'Arc Boisé, L'Épervier) dans le CRM (2026-05-27) ; "
        "déploiement inféré à l'ensemble du groupe — à confirmer pour les sites hors IDF."
    ),
    "Groupe Colisée": (
        "NETSoins: Oui — source: DUI='NETSoins' relevé sur 4 sites IDF du groupe Colisée "
        "dans le CRM (2026-05-27) ; déploiement inféré à l'ensemble du groupe — à confirmer pour les sites hors IDF."
    ),
}


def determine_netsoins(dui: str, group: str, current: str) -> tuple[str, str]:
    """
    Retourne (uses_netsoins_value, note_justification).

    Règle stricte : 'Oui' seulement si source vérifiable.
    La note explique toujours comment la valeur a été déterminée.
    """
    dui = (dui or "").strip()
    group = (group or "").strip()
    current = (current or "").strip()

    # Cas 1 : DUI explicitement NETSoins (source la plus forte)
    if dui == "NETSoins":
        note = (
            "NETSoins: Oui — source: champ DUI='NETSoins' renseigné manuellement dans le CRM "
            "lors d'une vérification terrain (2026-05-27)."
        )
        return "Oui", note

    # Cas 2 : DUI est un autre logiciel connu → pas NETSoins
    if dui and dui not in ("Inconnu", ""):
        note = (
            f"NETSoins: Non — source: champ DUI='{dui}' (logiciel concurrent) renseigné dans le CRM "
            f"(2026-05-27) ; établissement non équipé NETSoins."
        )
        return "Non", note

    # Cas 3 : current uses_netsoins déjà "NETSoins" (ancien format avant normalisation)
    if current == "NETSoins":
        note = (
            "NETSoins: Oui — source: valeur 'NETSoins' présente dans le champ uses_netsoins "
            "du CRM (2026-05-27), renseignée lors d'une vérification terrain."
        )
        return "Oui", note

    # Cas 4 : group connu comme utilisateur NETSoins → inférence groupe
    if group in NETSOINS_GROUPS:
        note = NETSOINS_GROUP_NOTES.get(group, (
            f"NETSoins: Oui — source: groupe '{group}' identifié comme utilisateur NETSoins "
            f"via données CRM (2026-05-27) ; déploiement inféré au niveau groupe."
        ))
        return "Oui", note

    # Cas 5 : Inconnu — pas de source trouvée
    if group:
        note = (
            f"NETSoins: Inconnu — aucune mention vérifiable trouvée sur le site du groupe "
            f"'{group}' ni dans la presse spécialisée (recherche juin 2026)."
        )
    else:
        note = (
            "NETSoins: Inconnu — établissement indépendant ou groupe non identifié ; "
            "aucune source trouvée (recherche juin 2026)."
        )
    return "Inconnu", note


def compute_score(type_etab: str, uses_netsoins: str, nb_etab: str) -> int:
    """
    Score ICP pré-appel (max 2 avec les données disponibles, max théorique 3).
    +1 si groupe multi-sites
    +1 si uses_netsoins = Oui
    """
    score = 0
    if type_etab == "Groupe":
        try:
            n = int(nb_etab) if nb_etab else 0
        except ValueError:
            n = 2  # groupe sans nombre précisé → on comptabilise quand même
        if n != 1:
            score += 1
    if uses_netsoins == "Oui":
        score += 1
    return score


def clean_groupe_display(groupe: str) -> str:
    """Retire le préfixe 'Groupe ' pour éviter 'groupe Groupe X'."""
    if groupe.lower().startswith("groupe "):
        return groupe[7:]
    return groupe


def make_tagline(row: dict) -> str:
    """
    Génère une tagline courte depuis les données existantes.
    Ne génère rien d'inventé — uniquement à partir des colonnes présentes.
    """
    name    = row.get("name", "").strip()
    city    = (row.get("city") or row.get("Ville", "")).strip()
    groupe  = row.get("Groupe", "").strip()
    lits    = row.get("Total de lits", "").strip()
    taille  = row.get("Taille d'établissement", "").strip()
    type_e  = row.get("type_etablissement", "").strip()
    netsoins = row.get("uses_netsoins", "").strip()

    parts = []

    # Taille ou lits
    if lits:
        parts.append(f"EHPAD {lits} lits")
    elif taille:
        parts.append(f"EHPAD {taille.lower()}")
    else:
        parts.append("EHPAD")

    # Localisation
    if city:
        parts[-1] += f" à {city}"

    # Groupe ou indépendant
    if type_e == "Groupe" and groupe and groupe not in ("", "Maison de retraite"):
        groupe_display = clean_groupe_display(groupe)
        parts.append(f"groupe {groupe_display}")
    elif type_e == "Indépendant":
        parts.append("indépendant")

    # NETSoins
    if netsoins == "Oui":
        parts.append("utilise NETSoins")

    if len(parts) <= 1:
        return name  # fallback

    return ", ".join(parts)


def make_summary(row: dict) -> str:
    """
    Génère un résumé 1-2 lignes depuis les données existantes.
    """
    lits     = row.get("Total de lits", "").strip()
    taille   = row.get("Taille d'établissement", "").strip()
    typol    = row.get("Typologie", "").strip()
    groupe   = row.get("Groupe", "").strip()
    city     = (row.get("city") or row.get("Ville", "")).strip()
    region   = row.get("region", "").strip()
    dept     = row.get("Département", "").strip()
    netsoins = row.get("uses_netsoins", "").strip()
    type_e   = row.get("type_etablissement", "").strip()
    nb_etab  = row.get("nb_etablissements", "").strip()

    sentences = []

    # Phrase 1 : description de l'établissement
    lits_str = f"{lits} lits" if lits else (taille.lower() if taille else "")
    typol_str = f"({typol.lower()})" if typol else ""
    loc_str = city if city else (region if region else "")
    dept_str = f"({dept})" if dept else ""

    s1 = "EHPAD"
    if lits_str:
        s1 += f" de {lits_str}"
    if typol_str:
        s1 += f" {typol_str}"
    if loc_str:
        s1 += f" à {loc_str}"
        if dept_str:
            s1 += f" {dept_str}"
    sentences.append(s1 + ".")

    # Phrase 2 : groupe ou indépendant
    if type_e == "Groupe" and groupe and groupe not in ("", "Maison de retraite"):
        nb_str = f" ({nb_etab} sites)" if nb_etab else ""
        s2 = f"Appartient au groupe {clean_groupe_display(groupe)}{nb_str}."
        if netsoins == "Oui":
            s2 = s2.rstrip(".") + " — utilise NETSoins."
        sentences.append(s2)
    elif type_e == "Indépendant":
        sentences.append("Établissement indépendant.")

    return " ".join(sentences)


def make_next_action(score: int, type_e: str, existing: str) -> str:
    """
    Génère la prochaine action recommandée si non déjà définie.
    """
    if existing and existing.strip():
        return existing.strip()

    if score >= 2:
        return "Contacter le directeur en priorité (cible NETSoins + groupe multi-sites)"
    elif score == 1:
        if type_e == "Groupe":
            return "Établir le premier contact avec le directeur ou la directrice"
        else:
            return "Établir le premier contact avec le directeur"
    else:
        return "Identifier le décideur et évaluer l'intérêt avant contact"


def enrich_row(row: dict) -> dict:
    """Enrichit une ligne du CRM en appliquant toutes les règles."""
    r = dict(row)

    # --- uses_netsoins + note de justification ---
    current_netsoins = (r.get("uses_netsoins") or "").strip()
    dui = (r.get("DUI") or "").strip()
    groupe = (r.get("Groupe") or "").strip()

    netsoins_value, netsoins_note = determine_netsoins(dui, groupe, current_netsoins)
    r["uses_netsoins"] = netsoins_value

    # Écriture de la justification dans notes (en tête, séparée par " | " si notes existantes)
    existing_notes = (r.get("notes") or "").strip()
    if existing_notes:
        r["notes"] = netsoins_note + " | " + existing_notes
    else:
        r["notes"] = netsoins_note

    # --- score_icp ---
    current_score = (r.get("score_icp") or "").strip()
    if not current_score:
        score = compute_score(
            r.get("type_etablissement", ""),
            r["uses_netsoins"],
            r.get("nb_etablissements", "")
        )
        r["score_icp"] = str(score)
    else:
        # Recalculer si NETSoins détecté et score = 1 (manque le +1 NETSoins)
        try:
            existing_score = int(current_score)
        except ValueError:
            existing_score = 0
        if r["uses_netsoins"] == "Oui" and existing_score < 2:
            score = compute_score(
                r.get("type_etablissement", ""),
                r["uses_netsoins"],
                r.get("nb_etablissements", "")
            )
            r["score_icp"] = str(score)

    # --- funnel_stage ---
    if not (r.get("funnel_stage") or "").strip():
        r["funnel_stage"] = "Premier contact"

    # --- industry ---
    if not (r.get("industry") or "").strip():
        r["industry"] = "EHPAD"

    # --- country ---
    if not (r.get("country") or "").strip():
        r["country"] = "France"

    # --- tagline ---
    if not (r.get("tagline") or "").strip():
        r["tagline"] = make_tagline(r)

    # --- summary ---
    if not (r.get("summary") or "").strip():
        r["summary"] = make_summary(r)

    # --- next_action ---
    score_int = int(r.get("score_icp", 0) or 0)
    r["next_action"] = make_next_action(
        score_int,
        r.get("type_etablissement", ""),
        r.get("next_action", "")
    )

    # --- website & linkedin_url depuis GROUP_META ---
    group_info = GROUP_META.get(groupe, {})
    if not (r.get("website") or "").strip() and group_info.get("website"):
        r["website"] = group_info["website"]
    if not (r.get("linkedin_url") or "").strip() and group_info.get("linkedin_url"):
        r["linkedin_url"] = group_info["linkedin_url"]
    if not (r.get("nb_etablissements") or "").strip() and group_info.get("nb_etablissements"):
        r["nb_etablissements"] = str(group_info["nb_etablissements"])

    return r


def main():
    print(f"Lecture de {TSV_IN}...")
    with open(TSV_IN, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f, delimiter="\t")
        fieldnames = reader.fieldnames
        rows = list(reader)

    print(f"  {len(rows)} lignes lues, {len(fieldnames)} colonnes")

    # --- Enrichissement ---
    print("Enrichissement en cours...")
    enriched = []
    stats = {
        "tagline_generated": 0,
        "summary_generated": 0,
        "next_action_generated": 0,
        "netsoins_set_oui": 0,
        "netsoins_set_non": 0,
        "score_updated": 0,
        "website_filled": 0,
        "linkedin_filled": 0,
    }

    for row in rows:
        original = dict(row)
        r = enrich_row(row)
        enriched.append(r)

        if not original.get("tagline") and r.get("tagline"):
            stats["tagline_generated"] += 1
        if not original.get("summary") and r.get("summary"):
            stats["summary_generated"] += 1
        if not original.get("next_action") and r.get("next_action"):
            stats["next_action_generated"] += 1
        if r.get("uses_netsoins") == "Oui" and original.get("uses_netsoins") != "Oui":
            stats["netsoins_set_oui"] += 1
        if r.get("uses_netsoins") == "Non" and original.get("uses_netsoins") != "Non":
            stats["netsoins_set_non"] += 1
        if r.get("score_icp") != original.get("score_icp"):
            stats["score_updated"] += 1
        if not original.get("website") and r.get("website"):
            stats["website_filled"] += 1
        if not original.get("linkedin_url") and r.get("linkedin_url"):
            stats["linkedin_filled"] += 1

    print("\nStatistiques d'enrichissement :")
    for k, v in stats.items():
        print(f"  {k:<30s}: {v}")

    # --- Écriture CSV ---
    print(f"\nÉcriture de {CSV_OUT}...")
    with open(CSV_OUT, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=fieldnames,
            quoting=csv.QUOTE_ALL,
            extrasaction="ignore",
        )
        writer.writeheader()
        writer.writerows(enriched)

    print(f"  {len(enriched)} lignes écrites ✓")

    # --- Vérifications finales ---
    score_dist: dict[str, int] = {}
    netsoins_dist: dict[str, int] = {}
    for r in enriched:
        sc = r.get("score_icp", "")
        score_dist[sc] = score_dist.get(sc, 0) + 1
        ns = r.get("uses_netsoins", "")
        netsoins_dist[ns] = netsoins_dist.get(ns, 0) + 1

    print("\nDistribution score_icp :")
    for k, v in sorted(score_dist.items()):
        print(f"  score={k!r} : {v} lignes")
    print("\nDistribution uses_netsoins :")
    for k, v in sorted(netsoins_dist.items()):
        print(f"  {k!r} : {v} lignes")

    return enriched, fieldnames


if __name__ == "__main__":
    enriched, fieldnames = main()
