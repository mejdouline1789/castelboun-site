# Domaine Castelboun — Site permaculture

## Structure du projet

```
├── index.html              # Site principal
├── netlify.toml            # Configuration Netlify
├── package.json            # Dépendances
└── netlify/functions/
    ├── data-api.mjs        # API : activités, événements, actualités
    └── calendar-ics.mjs    # Export ICS (webcal://)
```

## Configuration Netlify (à faire une seule fois)

### Variable d'environnement
Dans Netlify → Site settings → Environment variables, ajouter :
- Clé : `ADMIN_PASSWORD`
- Valeur : votre mot de passe admin

### Abonnement calendrier (webcal://)
URL : `webcal://permaculture-au-castelboun.netlify.app/calendar.ics`

## Développement local
```bash
npm install
netlify dev
```
