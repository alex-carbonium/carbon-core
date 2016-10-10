import DataProvider from "./DataProvider";
import DataProxy from "../../server/DataProxy";

const config = [
    {
        name: "People",
        children: [
            {name: "Full Name", examples: ["Jimmy Page", "Robert Plant"]},
            {name: "First Name", examples: ["Freddy", "Brian"]},
            {name: "Last Name", examples: ["Gilmour", "Waters"]},
            {name: "Title", examples: ["Mr", "Mrs"]},
            {name: "Gender", examples: ["Male", "Female"]},
            {name: "Race", examples: ["German", "French"]}
        ]
    },
    {
        name: "Business",
        children: [
            {name: "Company Name", examples: ["Google", "Microsoft"]},
            {name: "Job Title", examples: ["Engineer", "Technician"]},
            {name: "LinkedIn Skill", examples: ["Algorithms", "Payroll"]},
            {name: "Money", examples: ["$6.00", "€2.52"]},
            {name: "Currency", examples: ["Dollar", "Euro"]},
            {name: "Currency Code", examples: ["EUR", "USD"]}
        ]
    },
    {
        name: "Geography",
        children: [
            {name: "Country", examples: ["Spain", "Italy"]},
            {name: "State", examples: ["Montana", "Texas"]},
            {name: "City", examples: ["Moscow", "Berlin"]},
            {name: "Street Address", examples: ["31 Abbey Road", "25 Wall Street"]},
            {name: "Street Name", examples: ["Broadway", "Lombard Street"]},
            {name: "Street Number", examples: ["91 B", "105 C"]}
        ]
    }
];

export default class BuiltInDataProvider extends DataProvider{
    fetch(fields, rowCount){
        return DataProxy.generate(fields, rowCount);
    }
    getConfig(){
        return config;
    }
}