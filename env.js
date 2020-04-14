const { NODE_ENV } = process.env
if (NODE_ENV === 'production') {
    console.log('L\'Application est en production')
}
if (NODE_ENV === 'dev') {
    console.log('L\'Application est en mode développement')
}
console.log('Mode :', NODE_ENV)
