import DataProvider from "./DataProvider";
import DataProxy from "../../server/DataProxy";
import Text from "../text/Text";

const config = [
    {
        name: "People",
        children: [
            { name: "Full Name", templateId: "fullName", examples: ["Jimmy Page", "Robert Plant"] },
            { name: "First Name", templateId: "firstName", examples: ["Freddy", "Brian"] },
            { name: "Last Name", templateId: "lastName", examples: ["Gilmour", "Waters"] },
            { name: "Username", templateId: "username", examples: ["Paul_46", "Ringo-80"] },
            { name: "Title", templateId: "namePrefix", examples: ["Mr", "Mrs"] },
            { name: "Name Suffix", templateId: "nameSuffix", examples: ["PhD", "V"] },
            { name: "Email", templateId: "email", examples: ["brianjohnson@cdca.com", "angus.young@highway.au"] },
        ]
    },
    {
        name: "Business",
        children: [
            { name: "Company Name", templateId: "companyName", examples: ["Google", "Microsoft"] },
            { name: "Domain Name", templateId: "domainName", examples: ["google.com", "microsoft.com"] },
            { name: "URL", templateId: "url", examples: ["https://google.com", "https://microsoft.com"] },
            { name: "Job Title", templateId: "jobTitle", examples: ["Engineer", "Technician"] },
            { name: "Job Description", templateId: "jobDescription", examples: ["Dynamic", "Direct"] },
            { name: "Job Area", templateId: "jobArea", examples: ["Creative", "Optimization"] },
            { name: "Catch Phrase", templateId: "catchPhrase", examples: ["Persistent monitoring", "Fast solutions"] },
            { name: "Product", templateId: "product", examples: ["Table", "Chair"] },
            { name: "Product Name", templateId: "productName", examples: ["Handmade Table", "Small Soap"] },
            { name: "Product Material", templateId: "productMaterial", examples: ["Cotton", "Wood"] },
            { name: "Product Categories", templateId: "productCategories", examples: ["Automotive, Engines", "Baby, Soap"] },
            { name: "Product Adjective", templateId: "productAdjective", examples: ["Small", "Rustic"] },
            { name: "Color", templateId: "color", examples: ["Pink", "Green"] },
            { name: "Department", templateId: "department", examples: ["Electronics", "Grocery"] },
            { name: "Phone Number", templateId: "phoneNumber", examples: ["(735) 347-7090 x625", "1-815-194-4682"] }
        ]
    },
    {
        name: "Money",
        children: [
            { name: "Price", templateId: "price", examples: ["216.40", "815.00"] },
            { name: "Account", templateId: "account", examples: ["60654218", "23471997"] },
            { name: "Account Name", templateId: "accountName", examples: ["Savings Account", "Personal Loan Account"] },
            { name: "BIC", templateId: "bic", examples: ["CVRUMGW1050", "JOTUCFN1"] },
            { name: "IBAN", templateId: "iban", examples: ["VG7250U700950", "ES8700220801287"] },
            { name: "Credit Card Number", templateId: "creditCardNumber", examples: ["4012000077777777", "4009348888881881"] },
            { name: "Transaction Type", templateId: "transactionType", examples: ["payment", "withdrawal"] },
            { name: "Currency Code", templateId: "currencyCode", examples: ["USD", "EUR"] },
            { name: "Bitcon", templateId: "bitcoin", examples: ["369351K02GTI3411G2PEJZ8RH59AR8Q834", "3R36VHL8UVJ8019BHER899D3445"] },
        ]
    },
    {
        name: "Date",
        children: [
            { name: "Date of Birth", templateId: "dateOfBirth", examples: ["4/27/1950", "8/30/1946"] },
            { name: "Date of Birth Long", templateId: "dateOfBirthLong", examples: ["Sunday, November 23, 1997", "Sunday, August 29, 1993"] },
            { name: "Future Date", templateId: "dateFuture", examples: ["4/27/" + (new Date().getFullYear() + 1), "8/30/" + (new Date().getFullYear() + 2)] },
            { name: "Past Date", templateId: "datePast", examples: ["6/18/2016", "3/16/2016"] },
            { name: "Ago", templateId: "ago", examples: ["58 seconds ago", "15 minutes ago"] },
            { name: "Time", templateId: "time", examples: ["23:48", "0:13"] },
            { name: "Time AM", templateId: "timeAM", examples: ["3:13 AM", "6:35 AM"] },
            { name: "Time PM", templateId: "timePM", examples: ["3:18 PM", "0:2 PM"] },
            { name: "Year", templateId: "year", examples: ["1997", "2012"] }
        ]
    },
    {
        name: "Geography",
        children: [
            { name: "Country", templateId: "country", examples: ["Spain", "Italy"] },
            { name: "State", templateId: "state", examples: ["Montana", "Texas"] },
            { name: "City", templateId: "city", examples: ["Moscow", "Berlin"] },
            { name: "ZIP", templateId: "zipCode", examples: ["75013-9702", "25884"] },
            { name: "Country Code", templateId: "countryCode", examples: ["USA", "UK"] },
            { name: "Street Address", templateId: "streetAddress", examples: ["31 Abbey Road", "25 Wall Street"] },
            { name: "Street Name", templateId: "street", examples: ["Broadway", "Lombard Street"] },
            { name: "Street Number", templateId: "buildingNumber", examples: ["91 B", "105 C"] },
            { name: "Latitude", templateId: "latitude", examples: ["-86.3729", "47.7312"] },
            { name: "Longitude", templateId: "longitude", examples: ["56.4242", "-67.9782"] }
        ]
    },
    {
        name: "Computers",
        children: [
            { name: "Password", templateId: "password", examples: ["laoaieaaou", "yeioiouioo"] },
            { name: "IP", templateId: "ip", examples: ["241.157.62.236", "91.95.99.78"] },
            { name: "IPv6", templateId: "ipv6", examples: ["d27a:95da:83d7:1610:e285:f6ce:5551:752b", "ca97:a82:e06:1872:732d:8bb6:4112:9cfd"] },
            { name: "Protocol", templateId: "protocol", examples: ["http", "https"] },
            { name: "File Extension", templateId: "fileExtension", examples: ["mp4", "txt"] },
            { name: "File Name", templateId: "fileName", examples: ["nice_shirts.png", "customers.txt"] },
            { name: "File Type", templateId: "fileType", examples: ["audio", "video"] },
            { name: "Mime Type", templateId: "mimeType", examples: ["application/json", "video/mp4"] },
            { name: "SemVer", templateId: "semver", examples: ["5.2.4", "0.0.1"] },
            { name: "Version", templateId: "version", examples: ["9.3.1.3", "6.1.2.7"] },
            { name: "Exception", templateId: "exception", examples: ["System.FileNotFoundException", "System.NotImplementedException"] },
        ]
    },
    {
        name: "Random words",
        children: [
            { name: "Lorem Paragraph", templateId: "loremParagraph", examples: [] },
            { name: "Lorem Sentence", templateId: "loremSentence", examples: [] },
        ]
    }
];

export default class BuiltInDataProvider extends DataProvider {
    fetch(fields, rowCount) {
        return DataProxy.generate(fields.join(","), rowCount);
    }
    getConfig() {
        return config;
    }
    createElement(app, templateId) {
        var name = this._findNameByTemplateId(templateId);

        var element = new Text();
        element.prepareAndSetProps({
            content: "= " + name,
            font: app.props.defaultTextSettings.font,
            textStyleId: app.props.defaultTextSettings.textStyleId,
            dp: "builtin",
            df: templateId
        });
        element.runtimeProps.isDataElement = true;
        return element;
    }
    _findNameByTemplateId(templateId: string): string {
        for (var i = 0; i < config.length; ++i) {
            for (var j = 0; j < config[i].children.length; ++j) {
                var row = config[i].children[j];
                if (row.templateId === templateId) {
                    return row.name;
                }
            }
        }
        return "";
    }
}