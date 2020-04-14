express_mongo

# Variables d'environnement
Modifier le fichier .envExemple en .env et rentrer les données listé


# Signin / Signup

- Un email peut être utilisé par plusieurs utilisateurs 
- Le nom est unique

Du coup 'Signin' juste avec le nom et pas l'email

De même pour forgotPassword

# Fonctionnalités supplémentaire

- ForgotPassword
    -
    - Reinitialisation de mot de passe avec envoi de lien/token par mail
- Error/success page
    -
    - Page pour afficher les erreurs ou les succès de chaque requetes (Sauf status 500)
- Roles
    - 
    - *Admin* : Assigner la valeur `true` au role de l'utilisateur souhaité
    - *User* : Assigner la valeur `false` ... (par défault)
    - Le role *User* ne peut naviguer dans la list des utilisateurs, mais a accès à ses propres données
    - Le role *Admin* à accès à tout.
