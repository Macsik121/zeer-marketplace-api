const nodemailer = require('nodemailer');
const path = require('path');

function sendMail(emailAddress = "john.appleased.20@bk.ru") {    
    const fs = require('fs');

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            // type: 'OAuth2',
            // clientId: '99712186577-bdvihp26tcgjasvmulf6phnhlskni9jm.apps.googleusercontent.com',
            // clientSecret: 'Y2Sax0sI_vbHytujYzjMT0dH',
            user: 'akmaksa65@gmail.com',
            password: 'AsDf1234@!'
        }
    });

    const mailOptions = {
        from: 'akmaksa65@gmail.com',
        to: emailAddress,
        subject: 'Сброс пароля в сервисе ZEER',
        html: fs.createReadStream(path.resolve(__dirname, '../ui/src/resetPassword.html'))
    }

    transporter.sendMail(mailOptions, function(error, info) {
        error ? console.log(error) : console.log(info);
    });
}

module.exports = { sendMail };
