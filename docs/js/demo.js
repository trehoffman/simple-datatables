const t = document.createElement('table')
const data = {
    "headings": [
        "Name",
        "Job",
        "Company",
        "Ext.",
        "Start Date",
        "Email",
        "Phone No.",
        "Salary"
    ],
    "data": [
        [
            "Hedwig F. Nguyen",
            "Manager",
            "Arcu Vel Foundation",
            "9875",
            "March 27 2017",
            "nunc.ullamcorper@metusvitae.com",
            "070 8206 9605",
            "100.00"
        ],
        [
            "Genevieve U. Watts",
            "Manager",
            "Eget Incorporated",
            "9557",
            "July 18 2017",
            "Nullam.vitae@egestas.edu",
            "0800 025698",
            "99.99"
        ],
        [
            "Kyra S. Baldwin",
            "Manager",
            "Lorem Vitae Limited",
            "3854",
            "April 14 2016",
            "in@elita.org",
            "0800 237 8846",
            "352.45"
        ],
        [
            "Stephen V. Hill",
            "Manager",
            "Eget Mollis Institute",
            "8820",
            "March 3 2016",
            "eu@vel.com",
            "0800 682 4591",
            "69.69"
        ],
        [
            "Vielka Q. Chapman",
            "Manager",
            "Velit Pellentesque Ultricies Institute",
            "2307",
            "June 25 2017",
            "orci.Donec.nibh@mauriserateget.edu",
            "0800 181 5795",
            "420.69"
        ],
        [
            "Ocean W. Curtis",
            "Manager",
            "EU Ltd",
            "6868",
            "August 24 2017",
            "cursus.et@cursus.edu",
            "(016977) 9585",
            "9999.99"
        ],
        [
            "Kato F. Tucker",
            "Manager",
            "Vel Lectus Limited",
            "4713",
            "November 6 2017",
            "Duis@Lorem.edu",
            "070 0981 8503",
            "3.50"
        ],
        [
            "Robin J. Wise",
            "Manager",
            "iCurabitur Dictum PC",
            "3285",
            "February 9 2017",
            "blandit@montesnascetur.edu",
            "0800 259158",
            "50.45"
        ],
        [
            "Uriel H. Guerrero",
            "Assistant",
            "Mauris Inc.",
            "2294",
            "February 11 2018",
            "vitae@Innecorci.net",
            "0500 948772",
            "28.55"
        ],
        [
            "Yasir W. Benson",
            "Assistant",
            "At Incorporated",
            "3897",
            "January 13 2017",
            "ornare.elit.elit@atortor.edu",
            "0391 916 3600",
            "67.87"
        ],
        [
            "Shafira U. French",
            "Assistant",
            "Nisi Magna Incorporated",
            "5116",
            "July 23 2016",
            "metus.In.nec@bibendum.ca",
            "(018013) 26699",
            "0.23"
        ],
        [
            "Casey E. Hood",
            "Assistant",
            "Lorem Vitae Odio Consulting",
            "7079",
            "May 5 2017",
            "justo.Praesent@sitamet.ca",
            "0800 570796",
            "1.24"
        ],
        [
            "Caleb X. Finch",
            "Assistant",
            "Elit Associates",
            "3629",
            "September 19 2016",
            "condimentum@eleifend.com",
            "056 1551 7431",
            "14.15"
        ]
    ]
}

document.body.appendChild(t)

window.dt = new simpleDatatables.DataTable(t, {
    data,
    filters: {"Job": ["Manager"]},
    columns: [
        {
            select: 3,
            type: "string"
        },
        {
            select: 4,
            type: "date",
            format: "MMMM D, YYYY"
        }
    ],
    footer: {
        auto: true
    }
})
