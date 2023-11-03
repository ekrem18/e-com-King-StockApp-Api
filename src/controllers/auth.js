"use strict"
/* -------------------------------------------------------*/
// Auth Controller:

const User = require('../models/user')                                          //---> her Cont. bir modeli kullandığından Auth Cont'ı User modelini baz alıyor
const Token = require('../models/token')
const passwordEncrypt = require('../helpers/passwordEncrypt')

module.exports = {

    login: async (req, res) => {                                                //---> token oluşturma kısmı diyebilirim
        /*
            #swagger.tags = ["Authentication"]
            #swagger.summary = "Login"
            #swagger.description = 'Login with username (or email) and password.'
            #swagger.parameters["body"] = {
                in: "body",
                required: true,
                schema: {
                    "username": "test",
                    "password": "1234",
                }
            }
        */

        const { username, email, password } = req.body                          //---> req.body içerisinden işlem yapabilmek için bunları alıyorum

        if ((username || email) && password) {

            const user = await User.findOne({ $or: [{ username }, { email }] }) //---> user tablosu içinde ara ( username VEYA email birini getir)

            if (user && user.password == passwordEncrypt(password)) {           //---> kullanıcı geldi mi mu ve kullanıcının şifresi,  gelen şifreyle aynı mı? 

                if (user.is_active) {

                    let tokenData = await Token.findOne({ user_id: user._id })  //---> user_id: user._id eşleşen user'ın token'ı var mı tokenData'ya ata
                    if (!tokenData) tokenData = await Token.create({            //---> daha önceden bir token yoksa
                        user_id: user._id,                                      //---> token oluşturacağın user._id bu user._id
                        token: passwordEncrypt(user._id + Date.now())           
                    })

                    res.send({
                        error: false,
                        // token: tokenData.token,                              //---> normalde böle yazıyorken,
                        // FOR REACT PROJECT:
                        key: tokenData.token,                                   //---> FE. senkronu ile gidildiğinden key prop.i ile kullanıyorum
                        user,
                    })

                } else {

                    res.errorStatusCode = 401
                    throw new Error('This account is not active.')
                }
            } else {

                res.errorStatusCode = 401
                throw new Error('Wrong username/email or password.')
            }
        } else {

            res.errorStatusCode = 401
            throw new Error('Please enter username/email and password.')
        }
    },

    refresh: async (req, res) => {
        /*
            #swagger.tags = ['Authentication']
            #swagger.summary = 'JWT: Refresh'
            #swagger.description = 'Refresh accessToken with refreshToken'
            #swagger.parameters['body'] = {
                in: 'body',
                required: true,
                schema: {
                    bearer: {
                        refresh: '...refreshToken...'
                    }
                }
            }
        */

        const refreshToken = req.body?.bearer?.refreshToken

        if (refreshToken) {

            jwt.verify(refreshToken, process.env.REFRESH_KEY, async function (err, userData) {

                if (err) {

                    res.errorStatusCode = 401
                    throw err
                } else {

                    const { _id, password } = userData

                    if (_id && password) {

                        const user = await User.findOne({ _id })

                        if (user && user.password == password) {

                            if (user.is_active) {

                                // JWT:
                                const accessToken = jwt.sign(user.toJSON(), process.env.ACCESS_KEY, { expiresIn: '30m' })

                                res.send({
                                    error: false,
                                    bearer: { accessToken }
                                })

                            } else {

                                res.errorStatusCode = 401
                                throw new Error('This account is not active.')
                            }
                        } else {

                            res.errorStatusCode = 401
                            throw new Error('Wrong id or password.')
                        }
                    } else {

                        res.errorStatusCode = 401
                        throw new Error('Please enter id and password.')
                    }
                }
            })

        } else {
            res.errorStatusCode = 401
            throw new Error('Please enter token.refresh')
        }
    },

    logout: async (req, res) => {                                               //---> token silme kısmı diyebilirim
        /*
            #swagger.tags = ["Authentication"]
            #swagger.summary = "Logout"
            #swagger.description = 'Delete token key.'
        */

        const auth = req.headers?.authorization || null         // Token ...6s5d4gt56d4f6ghfdg...
        const tokenKey = auth ? auth.split(' ') : null          // ['Token', '...6s5d4gt56d4f6ghfdg...']

        let result = {}
        if (tokenKey && tokenKey[0] == 'Token') {                               //---> tokenkey var mı ve 0.endeksi 'Token' mı ? öyleyse;
            result = await Token.deleteOne({ token: tokenKey[1] })              //---> 1.endeksini yakala ve sil
        }

        res.send({
            error: false,
            message: 'Logout OK broo.',
            result
        })
    },
}