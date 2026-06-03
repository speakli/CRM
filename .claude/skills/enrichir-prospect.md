# Skill : Enrichir un prospect

## Déclencheur
Quand l'utilisateur dit "enrichis cet EHPAD", "trouve des infos sur [nom]",
"enrichis [nom]" ou formulation proche.

## ⚠️ Règle anti-hallucination (absolue)
- Ne jamais inventer une information non trouvée — écrire "Non trouvé" plutôt que deviner
- Toujours citer l'URL source pour chaque information présentée
- Pour le directeur : indiquer le lien LinkedIn exact trouvé, ou "Non trouvé"
- En cas de doute entre deux résultats (ex : deux noms différents), présenter les deux
  avec leurs sources et demander à l'utilisateur de trancher

## Étapes à suivre dans l'ordre

### 1. Identifier l'établissement
Extraire le nom de l'établissement depuis le message de l'utilisateur.
Si le nom est ambigu ou incomplet, demander une précision avant de continuer.

### 2. Recherche internet
Chercher dans cet ordre de priorité :

1. **Directeur** ⚠️ INDISPENSABLE — chercher sur LinkedIn en priorité
   ("directeur [nom établissement]"), puis sur le site web de l'établissement
2. Site web officiel
3. Téléphone
4. Nombre de lits
5. Utilisation de NETSoins (Oui / Non / Inconnu)
6. Adresse complète (ville, région)
7. Groupe parent (établissement indépendant ou appartient à un groupe ?)

### 3. Présenter les résultats
Afficher clairement ce qui a été trouvé et ce qui est inconnu :

```
🔍 Résultats pour [Nom de l'établissement]

✓ Trouvé :
  directeur       : ...
  site web        : ...
  téléphone       : ...
  nb lits         : ...
  uses_netsoins   : Oui / Non / Inconnu
  adresse         : ...
  type            : Groupe / Indépendant
  groupe parent   : ... (si applicable)

✗ Non trouvé :
  - [liste des champs introuvables]

Sources utilisées : [URLs]
```

⚠️ Si le directeur n'a pas été trouvé : le signaler explicitement et proposer
une recherche LinkedIn complémentaire avant de continuer.

### 4. Vérifier si l'établissement est déjà dans le CRM
Lire `data/companies.tsv` et chercher le nom de l'établissement.
- Si **existant** : indiquer quels champs seraient mis à jour vs déjà renseignés.
- Si **nouveau** : proposer de créer la fiche complète.

### 5. Proposer les modifications
Montrer exactement ce qui serait écrit dans le CRM (nouveaux champs ou mises à jour).
Calculer le score ICP d'après `docs/icp.md` avec les infos trouvées.

### 6. Attendre la confirmation
Ne rien écrire tant que l'utilisateur n'a pas dit "oui".

### 7. Écrire dans le CRM
Après confirmation, mettre à jour `data/companies.tsv` (et `data/contacts.tsv`
si un directeur a été trouvé et n'existe pas encore).
Mettre à jour `updated_at` = date du jour, `updated_by` = "Claude".
