# Changelog

## 2026-06-02

### Enrichissement des données — `data/companies.tsv`

- **Script `scripts/build_enriched_csv.py`** : génération de `data/companies-enriched.csv` à partir de `companies.tsv` (6 195 lignes EHPAD).
  - `tagline` générée pour les 6 189 lignes vides (format : "EHPAD X lits à Ville, groupe Groupe")
  - `summary` et `next_action` générés pour les 6 139 lignes vides
  - `uses_netsoins` déterminé par source vérifiable uniquement : champ DUI, portails publics NETSoins, inférence groupe — sinon "Inconnu"
  - `score_icp` recalculé selon `docs/icp.md` (+1 groupe multi-sites, +1 NETSoins) — 348 scores mis à jour de 1 → 2
  - `website` et `linkedin_url` remplis pour les grands groupes depuis un référentiel vérifié (919 websites, 835 LinkedIn)
  - `notes` ajouté sur chaque ligne : justification de la valeur `uses_netsoins` avec citation de source ou raison explicite de "Inconnu"
- Groupes NETSoins confirmés (score=2) : Colisée France (135 sites), Fondation Partage et Vie (79), ADEF Résidences (50), DomusVi (26), LNA Santé / Le Noble Âge (29)
- Patch appliqué dans `companies.tsv` : tagline, summary, uses_netsoins, score_icp, next_action, website, linkedin_url, industry, nb_etablissements, notes — sans écraser les champs déjà renseignés manuellement
- Log détaillé : `docs/enrichment-log.md`

### Interface CRM — `crm-app/`

#### Colonne Notes
- Retrait de la colonne `notes` de la table principale (trop large)
- Ajout du contenu `notes` dans le panneau de détail au clic, dans les deux vues : **CompaniesView** et **TableView**

#### Colonne LinkedIn
- Retrait de la colonne `linkedin_url` de la vue **CompaniesView** (table principale)
- Retrait de la colonne **Company LinkedIn** de la vue **TableView** (contacts)
- Données préservées dans le TSV et accessibles via le détail d'une company

#### Système de température — 3 niveaux

**1. Valeurs**
- Confirmé : `Chaud`, `Tiède`, `Froid` — cohérents avec `docs/crm-rules.md`
- Couleurs badge : rouge / amber / sky — inchangées

**2. Suggestion automatique** (`parseTSV.ts`)
- Nouvelle fonction `suggestTemperature(effectiveFunnelStage, scoreIcp, callsCount)` :
  - `Chaud` : funnel_stage = Démo ou Négociation, OU score_icp ≥ 4
  - `Tiède` : funnel_stage = Premier contact ET score_icp ≥ 3, OU au moins 1 appel enregistré
  - `Froid` : tout le reste
- Champ `_suggested_temperature` ajouté au type `CRMRow` — vide si température manuelle déjà renseignée
- **Règle stricte** : jamais écrasée si la température a été saisie manuellement

**3. Affichage**
- Badge de température toujours visible dans la table contacts (`TableView`) et dans le panneau de détail des companies (`CompaniesView`)
- Température manuelle → badge coloré normal
- Température auto-suggérée → badge coloré + indicateur `·auto` en opacité réduite
- Aucune valeur → badge gris `—`
- Prop `renderEmpty` ajoutée à `InlineSelect` (`InlineEdit.tsx`) pour permettre un rendu custom en état vide
