# Skill : Enregistrer un appel

## Déclencheur
Quand l'utilisateur dit "enregistre cet appel", "log cet appel" ou formulation proche.

## Étapes à suivre dans l'ordre

### 1. Lire les règles
Lis `docs/icp.md` et `docs/crm-rules.md` avant toute chose.

### 2. Extraire les informations depuis la dictée
Identifie :
- **Nom du contact** (prénom + nom si possible)
- **Entreprise** (nom de l'établissement ou du groupe)
- **Type d'échange** (Appel / Démo / Email / Message LinkedIn / Réunion)
- **Résumé** de ce qui s'est dit (points clés, objections, signaux)
- **Prochaine action** convenue

Si un de ces éléments est ambigu ou manquant, pose la question avant de continuer.

### 3. Vérifier l'existence dans le CRM
- Lis `data/companies.tsv` et cherche l'entreprise par nom
- Lis `data/contacts.tsv` et cherche le contact par nom
- Note ce que tu trouves (existant / nouveau)

### 4. Calculer le score ICP (0 à 3)
D'après `docs/icp.md`, évalue les 3 critères :
1. Utilise NETSoins ? (+1 si oui)
2. A exprimé un problème de charge administrative ? (+1 si oui)
3. Le directeur est ouvert aux outils numériques ? (+1 si oui)

Si une information est inconnue, ne mets pas le point (pas d'hypothèse).

### 5. Préparer les modifications et les montrer
Affiche un résumé clair de **tout ce que tu vas écrire** :
- Pour chaque fichier TSV : les champs et valeurs (créations et mises à jour)
- Le score ICP calculé avec le détail des points
- La ligne calls.tsv à ajouter

Format d'affichage :

```
📋 Voici ce que je vais enregistrer — dis "oui" pour confirmer :

ENTREPRISE (nouveau / mise à jour)
  nom : ...
  uses_netsoins : ...
  type_etablissement : ...
  score_icp : .../3 (détail : ...)
  funnel_stage : ...

CONTACT (nouveau / mise à jour)
  nom : ...
  job_title : ...
  temperature : ...
  recap : ...
  next_action : ...

APPEL (nouveau)
  date : ...
  type : ...
  summary : ...
  next_action : ...
```

### 6. Attendre la confirmation
N'écris rien tant que l'utilisateur n'a pas dit "oui" (ou une formulation équivalente).

### 7. Écrire dans les TSV
Après confirmation :
- Si **nouveau** : ajouter une ligne dans le TSV concerné
- Si **existant** : mettre à jour les champs pertinents (ne pas écraser ce qui n'a pas changé)
- Toujours ajouter la ligne dans `data/calls.tsv`
- Mettre à jour `updated_at` et `updated_by` = "me" sur les lignes modifiées

### Conventions à respecter
- IDs : minuscules, kebab-case (ex: `marie-dupont`, `groupe-korian`)
- ID d'un appel : `<contact-id>-<YYYY-MM-DD>`
- Dates : `YYYY-MM-DD`
- `created_at` et `updated_at` = date du jour
- `created_by` = "me"
