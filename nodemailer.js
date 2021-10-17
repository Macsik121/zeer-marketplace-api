const nodemailer = require('nodemailer');
const createLog = require('./createLog');
const smtpTransport = require('nodemailer-smtp-transport');

function sendMail({
    email,
    generatedPassword,
    navigator,
    locationData
}) {
    const transporter = nodemailer.createTransport(smtpTransport({
        service: 'gmail',
        secure: true,
        auth: {
            user: 'hiomimipad@gmail.com',
            pass: 'dov57erep135'
        }
    }));

    const mailOptions = {
        from: 'hiomimipad@gmail.com',
        to: email,
        subject: 'Сброс пароля в zeer.im',
        html: `
            <label>Сгенерированный пароль: ${generatedPassword}.</label><br />
            <a
                href="https://zeer-marketplace-ui-macsik121.herokuapp.com"
            >
                Зайти в аккаунт с сгенерированным паролем
            </a>
        `
    };

    transporter.sendMail(mailOptions, function(err, info) {
        if (err) {
            console.log(err);
        } else {
            console.log('Email sent:' + info.response);
        }
    });

    createLog({
        log: {
            name: email,
            action: 'Сообщение о сбросе пароля отправлено на почту'
        },
        navigator,
        locationData,
        browser: null,
        platform: null
    });
}

module.exports = { sendMail };
