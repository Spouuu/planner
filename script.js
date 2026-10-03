var S = {
    tab: 'cal',
    cal: null,
    mode: 'school',
    cw: '',
    lessons: [],
    tests: [],
    goals: [],
    grades: [],
    notes: [],
    holidays: [],
    target: '',
    note: null,
    sel: null,
    week: null
};

var N = new Date();

try {
    var d = JSON.parse(localStorage.getItem('planner-v1') || '{}');

    for (var k in d) {
        S[k] = d[k];
    }
} catch (e) {}

if (!S.cal) {
    S.cal = {
        y: N.getFullYear(),
        m: N.getMonth()
    };
}

if (!S.holidays) {
    S.holidays = [];
}

if (!S.tests) {
    S.tests = [];
}

if (!S.goals) {
    S.goals = [];
}

if (!S.lessons) {
    S.lessons = [];
}

if (!S.grades) {
    S.grades = [];
}

if (!S.notes) {
    S.notes = [];
}


/* =========================
   OCENY
========================= */

function pg(x) {
    x = String(x == null ? '' : x)
        .trim()
        .replace(',', '.');

    var m = x.match(/^(\d(?:\.\d+)?)([+\-−]?)$/);

    if (!m) return NaN;

    var v = parseFloat(m[1]);

    if (m[2] && S.mode != 'uni') {
        v += m[2] == '+' ? 0.5 : -0.25;
    }

    return v;
}


/* =========================
   ŚWIĘTA USTAWOWE
========================= */

function hols(y) {
    var a = y % 19,
        b = Math.floor(y / 100),
        c = y % 100,
        d = Math.floor(b / 4),
        e = b % 4,
        f = Math.floor((b + 8) / 25),
        g = Math.floor((b - f + 1) / 3),
        h = (19 * a + b - d - g + 15) % 30,
        i = Math.floor(c / 4),
        k = c % 4,
        l = (32 + 2 * e + 2 * i - h - k) % 7,
        m = Math.floor((a + 11 * h + 22 * l) / 451),
        mo = Math.floor((h + l - 7 * m + 114) / 31),
        da = (h + l - 7 * m + 114) % 31 + 1;

    var H = {};

    var P = function(n) {
        return ('0' + n).slice(-2);
    };

    function add(mm, dd, nm) {
        H[y + '-' + P(mm) + '-' + P(dd)] = nm;
    }

    [
        [1, 1, 'Nowy Rok'],
        [1, 6, 'Trzech Króli'],
        [5, 1, 'Święto Pracy'],
        [5, 3, 'Święto Konstytucji 3 Maja'],
        [8, 15, 'Wniebowzięcie NMP'],
        [11, 1, 'Wszystkich Świętych'],
        [11, 11, 'Święto Niepodległości'],
        [12, 24, 'Wigilia'],
        [12, 25, 'Boże Narodzenie'],
        [12, 26, 'Drugi dzień świąt']
    ].forEach(function(x) {
        add(x[0], x[1], x[2]);
    });

    [
        [0, 'Wielkanoc'],
        [1, 'Poniedziałek Wielkanocny'],
        [49, 'Zielone Świątki'],
        [60, 'Boże Ciało']
    ].forEach(function(x) {
        var t = new Date(
            y,
            mo - 1,
            da + x[0]
        );

        add(
            t.getMonth() + 1,
            t.getDate(),
            x[1]
        );
    });

    return H;
}


/* =========================
   WŁASNE DNI WOLNE
========================= */

function customHols(y) {
    var H = {};

    S.holidays.forEach(function(h) {
        if (!h.date) return;

        var start = h.date;
        var end = h.endDate || h.date;

        var a = new Date(start + 'T00:00:00');
        var b = new Date(end + 'T00:00:00');

        if (isNaN(a.getTime()) || isNaN(b.getTime())) {
            return;
        }

        while (a <= b) {
            if (a.getFullYear() == y) {
                var mm = ('0' + (a.getMonth() + 1)).slice(-2);
                var dd = ('0' + a.getDate()).slice(-2);

                var key =
                    a.getFullYear() +
                    '-' +
                    mm +
                    '-' +
                    dd;

                H[key] = h.name;
            }

            a.setDate(a.getDate() + 1);
        }
    });

    return H;
}


/* =========================
   PLAN NA DZIŚ
========================= */

function todayBar() {
    var dw = (N.getDay() + 6) % 7;

    var L = S.lessons
        .filter(function(l) {
            return Number(l.day) == dw;
        })
        .sort(function(a, b) {
            return a.time > b.time ? 1 : -1;
        });

    if (!L.length) return '';

    return (
        '<div class="box" style="display:block">' +
        '<b>Dziś:</b> ' +
        L.map(function(l) {
            return (
                esc(l.time) +
                ' ' +
                esc(l.subj) +
                (
                    l.room ?
                    ' (' + esc(l.room) + ')' :
                    ''
                )
            );
        }).join(' · ') +
        '</div>'
    );
}


/* =========================
   ZAPIS
========================= */

function save() {
    try {
        localStorage.setItem(
            'planner-v1',
            JSON.stringify(S)
        );
    } catch (e) {}
}


/* =========================
   ESCAPE HTML
========================= */

function esc(s) {
    return String(
        s == null ? '' : s
    ).replace(/[&<>"]/g, function(c) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;'
        }[c];
    });
}


/* =========================
   ELEMENT
========================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================
   ID
========================= */

function id() {
    return Date.now() + Math.random();
}


/* =========================
   ZAKŁADKI
========================= */

var TABS = {
    cal: 'Kalendarz',
    week: 'Tydzień',
    tests: 'Sprawdziany',
    plan: 'Plan lekcji',
    goals: 'Cele',
    grades: 'Oceny',
    notes: 'Notatki'
};


/* =========================
   ŚREDNIA
========================= */

function avg(a) {
    var w = 0;
    var s = 0;

    a.forEach(function(g) {
        var v = pg(g.v);
        var x = parseFloat(g.w) || 1;

        if (!isNaN(v)) {
            s += v * x;
            w += x;
        }
    });

    return w ? s / w : null;
}


/* =========================
   FORMATOWANIE
========================= */

function f(n) {
    return n == null ? '–' : n.toFixed(2);
}


function days(d) {
    var n = Math.ceil(
        (
            new Date(d) -
            new Date().setHours(0, 0, 0, 0)
        ) / 864e5
    );

    return n < 0 ?
        'minął' :
        n == 0 ?
        'dziś' :
        n == 1 ?
        'jutro' :
        'za ' + n + ' dni';
}


function val(g) {
    return g.real !== '' && g.real != null ?
        g.real :
        g.plan;
}


/* =========================
   PRIORYTETY
========================= */

function priorityName(p) {
    if (p == 'high') return '🔴 Pilne';
    if (p == 'medium') return '🟡 Ważne';

    return '⚪ Normalne';
}


function priorityClass(p) {
    if (p == 'high') return ' priority-high';
    if (p == 'medium') return ' priority-medium';

    return '';
}


/* =========================
   DATA
========================= */

function dateKey(date) {
    return (
        date.getFullYear() +
        '-' +
        ('0' + (date.getMonth() + 1)).slice(-2) +
        '-' +
        ('0' + date.getDate()).slice(-2)
    );
}


function parseDateKey(s) {
    var p = String(s).split('-');

    return new Date(
        Number(p[0]),
        Number(p[1]) - 1,
        Number(p[2])
    );
}


function weekStart(date) {
    var d = new Date(date);

    var day = (d.getDay() + 6) % 7;

    d.setHours(0, 0, 0, 0);

    d.setDate(
        d.getDate() - day
    );

    return d;
}


function formatShortDate(date) {
    return (
        ('0' + date.getDate()).slice(-2) +
        '.' +
        ('0' + (date.getMonth() + 1)).slice(-2)
    );
}


/* =========================
   QUICK ADD
========================= */

function quickAddBox() {
    return (
        '<div class="quick-add">' +

        '<button ' +
        'class="quick-main" ' +
        'data-quick="1">' +
        '+' +
        '</button>' +

        '<div class="quick-menu" id="quickMenu">' +

        '<button data-quicktype="task">' +
        '📝 Zadanie' +
        '</button>' +

        '<button data-quicktype="test">' +
        '📚 Sprawdzian' +
        '</button>' +

        '<button data-quicktype="goal">' +
        '🎯 Cel' +
        '</button>' +

        '<button data-quicktype="grade">' +
        '⭐ Ocena' +
        '</button>' +

        '<button data-quicktype="holiday">' +
        '📅 Dni wolne' +
        '</button>' +

        '<button data-quicktype="note">' +
        '📓 Notatka' +
        '</button>' +

        '</div>' +

        '</div>'
    );
}


/* =========================
   TYDZIEŃ
========================= */

function renderWeek() {
    var start = S.week ?
        parseDateKey(S.week) :
        weekStart(N);

    var names = [
        'Pon',
        'Wt',
        'Śr',
        'Czw',
        'Pt',
        'Sob',
        'Nd'
    ];

    var out =
        '<div class="week-head">' +

        '<button data-week="-1">‹</button>' +

        '<b>' +
        formatShortDate(start) +
        ' – ';

    var end = new Date(start);
    end.setDate(end.getDate() + 6);

    out +=
        formatShortDate(end) +
        '</b>' +

        '<button data-week="1">›</button>' +

        '</div>';

    out += '<div class="week-grid">';

    for (var i = 0; i < 7; i++) {
        var d = new Date(start);

        d.setDate(
            start.getDate() + i
        );

        var key = dateKey(d);

        var lessons = S.lessons
            .filter(function(l) {
                return Number(l.day) == i;
            })
            .sort(function(a, b) {
                return a.time > b.time ? 1 : -1;
            });

        var tests = S.tests.filter(function(t) {
            return t.date == key;
        });

        var goals = S.goals.filter(function(g) {
            return g.date == key;
        });

        var holiday = customHols(
            d.getFullYear()
        )[key];

        out +=
            '<div class="week-day">' +

            '<div class="week-day-head">' +

            '<b>' +
            names[i] +
            '</b>' +

            '<small>' +
            formatShortDate(d) +
            '</small>' +

            '</div>';

        if (holiday) {
            out +=
                '<div class="week-holiday">' +
                esc(holiday) +
                '</div>';
        }

        lessons.forEach(function(l) {
            out +=
                '<div class="week-item lesson">' +

                '<b>' +
                esc(l.time || '') +
                '</b> ' +

                esc(l.subj) +

                (
                    l.room ?
                    '<small> · ' +
                    esc(l.room) +
                    '</small>' :
                    ''
                ) +

                '</div>';
        });

        tests.forEach(function(t) {
            out +=
                '<div class="week-item test">' +
                '📚 ' +
                esc(t.subj) +
                (
                    t.topic ?
                    '<small> · ' +
                    esc(t.topic) +
                    '</small>' :
                    ''
                ) +
                '</div>';
        });

        goals.forEach(function(g) {
            out +=
                '<div class="week-item goal">' +
                '🎯 ' +
                esc(g.subj) +
                '</div>';
        });

        if (!lessons.length &&
            !tests.length &&
            !goals.length &&
            !holiday
        ) {
            out +=
                '<div class="mut">' +
                'Brak wpisów' +
                '</div>';
        }

        out += '</div>';
    }

    out += '</div>';

    return out;
}


/* =========================
   RENDER
========================= */

function render() {

    $('nav').innerHTML =
        Object.keys(TABS)
        .map(function(t) {
            return (
                '<button ' +
                'data-tab="' +
                t +
                '" ' +
                'class="' +
                (S.tab == t ? 'on' : '') +
                '">' +
                TABS[t] +
                '</button>'
            );
        })
        .join('');

    var h = '';


    /* =========================
       KALENDARZ
    ========================= */

    if (S.tab == 'cal') {

        var y = S.cal.y;
        var m = S.cal.m;

        var fi =
            (
                new Date(y, m, 1).getDay() +
                6
            ) % 7;

        var dim =
            new Date(
                y,
                m + 1,
                0
            ).getDate();

        var ev = {};
        var HL = hols(y);
        var CH = customHols(y);

        var p2 = function(n) {
            return ('0' + n).slice(-2);
        };


        S.tests.forEach(function(t) {
            if (t.date) {
                (
                    ev[t.date] =
                    ev[t.date] || []
                ).push(
                    '<b>' +
                    esc(t.subj) +
                    '</b>'
                );
            }
        });


        S.goals.forEach(function(t) {
            if (t.date) {
                (
                    ev[t.date] =
                    ev[t.date] || []
                ).push(
                    '<u>' +
                    esc(t.subj) +
                    '</u>'
                );
            }
        });


        h =
            todayBar() +

            '<div class="cn">' +

            '<button data-cal="-1">' +
            '‹' +
            '</button>' +

            '<h3>' + [
                'Styczeń',
                'Luty',
                'Marzec',
                'Kwiecień',
                'Maj',
                'Czerwiec',
                'Lipiec',
                'Sierpień',
                'Wrzesień',
                'Październik',
                'Listopad',
                'Grudzień'
            ][m] +
            ' ' +
            y +
            '</h3>' +

            '<button data-cal="1">' +
            '›' +
            '</button>' +

            '</div>' +

            '<div class="cg">' +

            [
                'Pn',
                'Wt',
                'Śr',
                'Cz',
                'Pt',
                'So',
                'Nd'
            ]
            .map(function(x) {
                return (
                    '<div class="dh">' +
                    x +
                    '</div>'
                );
            })
            .join('');


        for (var i = 0; i < fi; i++) {
            h += '<div class="d e"></div>';
        }


        for (var dayNumber = 1; dayNumber <= dim; dayNumber++) {

            var K =
                y +
                '-' +
                p2(m + 1) +
                '-' +
                p2(dayNumber);

            var L = ev[K] || [];

            var td =
                dayNumber == N.getDate() &&
                m == N.getMonth() &&
                y == N.getFullYear();

            var holidayName =
                CH[K] || HL[K];

            h +=
                '<div ' +
                'data-day="' +
                K +
                '" ' +
                'class="d' +
                (td ? ' td' : '') +
                (S.sel == K ? ' sel' : '') +
                (holidayName ? ' hd' : '') +
                '"' +

                (
                    holidayName ?
                    ' title="' +
                    esc(holidayName) +
                    '"' :
                    ''
                ) +

                '>' +

                '<span>' +
                dayNumber +
                '</span>' +

                (
                    holidayName ?
                    '<u>' +
                    esc(holidayName) +
                    '</u>' :
                    ''
                ) +

                L.slice(0, 2).join('') +

                (
                    L.length > 2 ?
                    '<i>+' +
                    (L.length - 2) +
                    '</i>' :
                    ''
                ) +

                '</div>';
        }


        h +=
            '</div>' +

            '<p class="mut">' +
            '■ sprawdzian &nbsp; ' +
            '□ cel &nbsp; ' +
            '▨ dzień wolny &nbsp; ' +
            '— kliknij dzień, aby dodać wpis' +
            '</p>';


        /* =========================
           WYBRANY DZIEŃ
        ========================= */

        if (S.sel) {

            var selectedHoliday =
                CH[S.sel] || HL[S.sel];

            var it =
                S.tests
                .filter(function(x) {
                    return x.date == S.sel;
                })
                .map(function(x) {
                    return {
                        k: 'tests',
                        x: x,
                        l: 'Sprawdzian'
                    };
                })
                .concat(
                    S.goals
                    .filter(function(x) {
                        return x.date == S.sel;
                    })
                    .map(function(x) {
                        return {
                            k: 'goals',
                            x: x,
                            l: 'Cel'
                        };
                    })
                );


            h +=
                '<div id="dayform" class="box" style="display:block">' +

                '<h2 style="margin-top:0">' +

                S.sel
                .split('-')
                .reverse()
                .join('.') +

                (
                    selectedHoliday ?
                    ' <small class="mut">' +
                    esc(selectedHoliday) +
                    '</small>' :
                    ''
                ) +

                '</h2>';


            /* =========================
               DZIEŃ WOLNY
            ========================= */

            var existingHoliday =
                S.holidays.filter(function(x) {
                    return (
                        x.date == S.sel ||
                        (
                            x.date <= S.sel &&
                            (x.endDate || x.date) >= S.sel
                        )
                    );
                })[0];


            h +=
                '<div class="row">' +

                '<input ' +
                'id="holidayName" ' +
                'placeholder="Nazwa dnia wolnego" ' +
                'value="' +
                (
                    existingHoliday ?
                    esc(existingHoliday.name) :
                    ''
                ) +
                '">' +

                '<input ' +
                'id="holidayEnd" ' +
                'type="date" ' +
                'value="' +
                (
                    existingHoliday ?
                    (
                        existingHoliday.endDate ||
                        existingHoliday.date
                    ) :
                    S.sel
                ) +
                '">' +

                '<button ' +
                'class="btn" ' +
                'data-addholiday="1">' +

                (
                    existingHoliday ?
                    'Zmień dzień wolny' :
                    'Ustaw dzień wolny'
                ) +

                '</button>' +

                (
                    existingHoliday ?
                    '<button data-delholiday="1">' +
                    'Usuń dzień wolny' +
                    '</button>' :
                    ''
                ) +

                '</div>';


            /* =========================
               WPISY
            ========================= */

            h +=
                it.map(function(o) {
                    return (

                        '<div class="item">' +

                        '<div class="t">' +

                        '<b>' +
                        esc(o.x.subj) +
                        '</b> ' +

                        '<small>' +
                        o.l +

                        (
                            o.x.topic ?
                            ' · ' +
                            esc(o.x.topic) :
                            ''
                        ) +

                        '</small>' +

                        '</div>' +

                        '<button ' +
                        'class="x" ' +
                        'data-del="' +
                        o.k +
                        '" ' +
                        'data-id="' +
                        o.x.id +
                        '">' +

                        '✕' +

                        '</button>' +

                        '</div>'
                    );
                })
                .join('');


            /* =========================
               DODAWANIE
            ========================= */

            h +=
                '<div class="row">' +

                '<select id="a7">' +

                '<option value="tests">' +
                'Sprawdzian' +
                '</option>' +

                '<option value="goals">' +
                'Cel' +
                '</option>' +

                '</select>' +

                '<input ' +
                'id="a1" ' +
                'placeholder="Przedmiot / cel">' +

                '<input ' +
                'id="a2" ' +
                'placeholder="Zakres (opcjonalnie)">' +

                '</div>' +

                '<div class="row" style="margin:0">' +

                '<button ' +
                'class="btn" ' +
                'data-addday="1">' +

                'Dodaj do tego dnia' +

                '</button>' +

                '<button data-closeday="1">' +
                'Zamknij' +
                '</button>' +

                '</div>' +

                '</div>';
        }
    }


    /* =========================
       TYDZIEŃ
    ========================= */

    if (S.tab == 'week') {

        h =
            renderWeek() +

            '<p class="mut">' +
            'Tydzień pokazuje lekcje, ' +
            'sprawdziany, cele i dni wolne.' +
            '</p>';
    }


    /* =========================
       PLAN LEKCJI
    ========================= */

    if (S.tab == 'plan') {

        var DN = [
            'Poniedziałek',
            'Wtorek',
            'Środa',
            'Czwartek',
            'Piątek',
            'Sobota',
            'Niedziela'
        ];

        var tdw =
            (N.getDay() + 6) % 7;


        h =
            '<div class="row">' +

            '<select id="a7">' +

            DN.map(function(n, i) {
                return (
                    '<option value="' +
                    i +
                    '"' +
                    (
                        i == tdw ?
                        ' selected' :
                        ''
                    ) +
                    '>' +
                    n +
                    '</option>'
                );
            }).join('') +

            '</select>' +

            '<input id="a3" type="time">' +

            '<input ' +
            'id="a1" ' +
            'placeholder="Przedmiot">' +

            '<input ' +
            'id="a2" ' +
            'placeholder="Sala">' +

            '<button ' +
            'class="btn" ' +
            'data-addl="1">' +

            'Dodaj' +

            '</button>' +

            '</div>';


        DN.forEach(function(n, i) {

            var L =
                S.lessons
                .filter(function(l) {
                    return Number(l.day) == i;
                })
                .sort(function(a, b) {
                    return a.time > b.time ?
                        1 :
                        -1;
                });


            if (i > 4 && !L.length) {
                return;
            }


            h +=
                '<h2>' +
                n +

                (
                    i == tdw ?
                    ' · dziś' :
                    ''
                ) +

                '</h2>' +

                (
                    L.map(function(l) {
                        return (

                            '<div class="item">' +

                            '<span class="bd">' +
                            esc(l.time || '–') +
                            '</span>' +

                            '<div class="t">' +

                            '<b>' +
                            esc(l.subj) +
                            '</b> ' +

                            '<small>' +
                            esc(l.room) +
                            '</small>' +

                            '</div>' +

                            '<button ' +
                            'class="x" ' +
                            'data-del="lessons" ' +
                            'data-id="' +
                            l.id +
                            '">' +

                            '✕' +

                            '</button>' +

                            '</div>'
                        );
                    }).join('') ||

                    '<p class="mut">Wolne</p>'
                );
        });
    }


    /* =========================
       SPRAWDZIANY
    ========================= */

    if (S.tab == 'tests') {

        h =
            '<div class="row">' +

            '<input ' +
            'id="a1" ' +
            'placeholder="Przedmiot">' +

            '<input ' +
            'id="a2" ' +
            'placeholder="Zakres / temat">' +

            '<input ' +
            'id="a3" ' +
            'type="date">' +

            '<select id="a8">' +

            '<option value="normal">' +
            '⚪ Normalne' +
            '</option>' +

            '<option value="medium">' +
            '🟡 Ważne' +
            '</option>' +

            '<option value="high">' +
            '🔴 Pilne' +
            '</option>' +

            '</select>' +

            '<button ' +
            'class="btn" ' +
            'data-add="tests">' +

            'Dodaj' +

            '</button>' +

            '</div>';


        h +=
            S.tests
            .slice()
            .sort(function(a, b) {
                return a.date > b.date ? 1 : -1;
            })
            .map(function(t) {

                var checklist =
                    t.checklist || [];

                return (

                    '<div class="item test-card ' +
                    (t.done ? 'done' : '') +
                    priorityClass(t.priority) +
                    '">' +

                    '<input ' +
                    'type="checkbox" ' +
                    'data-done="tests" ' +
                    'data-id="' +
                    t.id +
                    '"' +
                    (
                        t.done ?
                        ' checked' :
                        ''
                    ) +
                    '>' +

                    '<div class="t">' +

                    '<b>' +
                    esc(t.subj) +
                    '</b> ' +

                    '<small>' +
                    esc(t.topic) +
                    '</small>' +

                    '<br>' +

                    '<small>' +
                    esc(t.date) +
                    '</small>' +

                    '<br>' +

                    '<small>' +
                    priorityName(t.priority) +
                    '</small>' +

                    '</div>' +

                    (
                        t.date ?
                        '<span class="bd">' +
                        days(t.date) +
                        '</span>' :
                        ''
                    ) +

                    '<button ' +
                    'data-checklist="' +
                    t.id +
                    '">' +

                    '☑ Zakres nauki' +

                    '</button>' +

                    '<div class="test-checklist">' +

                    (
                        checklist.length ?
                        checklist.map(function(c) {
                            return (

                                '<div class="check-item">' +

                                '<label>' +
                                '<input ' +
                                'type="checkbox" ' +
                                'data-check="' +
                                t.id +
                                '" ' +
                                'data-checkid="' +
                                c.id +
                                '"' +
                                (
                                    c.done ?
                                    ' checked' :
                                    ''
                                ) +
                                '>' +

                                '<span class="' +
                                (
                                    c.done ?
                                    'check-done' :
                                    ''
                                ) +
                                '">' +

                                esc(c.text) +

                                '</span>' +
                                '</label>' +

                                '<button type="button" ' +
                                'class="check-remove" ' +
                                'aria-label="Usuń punkt: ' +
                                esc(c.text) +
                                '" title="Usuń punkt" ' +
                                'data-delcheck="' +
                                t.id +
                                '" data-checkid="' +
                                c.id +
                                '">✕</button>' +

                                '</div>'
                            );
                        }).join('')

                        :
                        '<span class="mut">' +
                        'Brak punktów.' +
                        '</span>'
                    ) +

                    '<button ' +
                    'data-addcheck="' +
                    t.id +
                    '">' +

                    '+ Dodaj punkt' +

                    '</button>' +

                    '</div>' +

                    '<button ' +
                    'class="x" ' +
                    'type="button" ' +
                    'aria-label="Usuń sprawdzian: ' +
                    esc(t.subj) +
                    '" title="Usuń sprawdzian" ' +
                    'data-del="tests" ' +
                    'data-id="' +
                    t.id +
                    '">' +

                    '✕' +

                    '</button>' +

                    '</div>'
                );
            })
            .join('') ||

            '<p class="mut">' +
            'Brak sprawdzianów.' +
            '</p>';
    }


    /* =========================
       CELE
    ========================= */

    if (S.tab == 'goals') {

        h =
            '<div class="row">' +

            '<input ' +
            'id="a1" ' +
            'placeholder="Mój cel">' +

            '<input ' +
            'id="a3" ' +
            'type="date">' +

            '<select id="a8">' +

            '<option value="normal">' +
            '⚪ Normalny' +
            '</option>' +

            '<option value="medium">' +
            '🟡 Ważny' +
            '</option>' +

            '<option value="high">' +
            '🔴 Pilny' +
            '</option>' +

            '</select>' +

            '<button ' +
            'class="btn" ' +
            'data-add="goals">' +

            'Dodaj' +

            '</button>' +

            '</div>';


        h +=
            S.goals
            .map(function(t) {

                return (

                    '<div class="item ' +
                    (t.done ? 'done' : '') +
                    priorityClass(t.priority) +
                    '">' +

                    '<input ' +
                    'type="checkbox" ' +
                    'data-done="goals" ' +
                    'data-id="' +
                    t.id +
                    '"' +
                    (
                        t.done ?
                        ' checked' :
                        ''
                    ) +
                    '>' +

                    '<div class="t">' +

                    '<b>' +
                    esc(t.subj) +
                    '</b>' +

                    (
                        t.date ?
                        '<br><small>do ' +
                        esc(t.date) +
                        ' · ' +
                        days(t.date) +
                        '</small>' :
                        ''
                    ) +

                    '<br>' +

                    '<small>' +
                    priorityName(t.priority) +
                    '</small>' +

                    '</div>' +

                    '<button ' +
                    'class="x" ' +
                    'data-del="goals" ' +
                    'data-id="' +
                    t.id +
                    '">' +

                    '✕' +

                    '</button>' +

                    '</div>'
                );
            })
            .join('') ||

            '<p class="mut">' +
            'Brak celów.' +
            '</p>';
    }


    /* =========================
       OCENY
    ========================= */

    if (S.tab == 'grades') {

        var cur = avg(
            S.grades
            .filter(function(g) {
                return (
                    g.real !== '' &&
                    g.real != null
                );
            })
            .map(function(g) {
                return {
                    v: g.real,
                    w: g.w
                };
            })
        );


        var pro = avg(
            S.grades.map(function(g) {
                return {
                    v: val(g),
                    w: g.w
                };
            })
        );


        var tg =
            parseFloat(S.target);

        var diff = !isNaN(tg) && pro != null ?
            pro - tg :
            null;


        h =
            '<div class="box">' +

            '<div>' +

            '<span class="mut">Cel</span><br>' +

            '<input ' +
            'id="tg" ' +
            'type="number" ' +
            'step="0.01" ' +
            'class="g" ' +
            'value="' +
            esc(S.target) +
            '">' +

            '</div>' +

            '<div>' +

            '<span class="mut">Aktualna</span>' +

            '<div class="big">' +
            f(cur) +
            '</div>' +

            '</div>' +

            '<div>' +

            '<span class="mut">Z planem</span>' +

            '<div class="big">' +
            f(pro) +
            '</div>' +

            '</div>' +

            '</div>';


        if (diff != null) {

            h +=
                '<p><b>' +

                (
                    diff >= 0 ?
                    'Jesteś na dobrej drodze: ' +
                    diff.toFixed(2) +
                    ' powyżej celu.' :
                    'Brakuje ' +
                    (-diff).toFixed(2) +
                    ' do celu.'
                ) +

                '</b></p>';
        }


        h +=
            '<div class="row">' +

            '<select id="md">' +

            '<option value="school"' +
            (
                S.mode == 'uni' ?
                '' :
                ' selected'
            ) +
            '>' +

            'Szkoła: oceny 1–6, plus i minus' +

            '</option>' +

            '<option value="uni"' +
            (
                S.mode == 'uni' ?
                ' selected' :
                ''
            ) +
            '>' +

            'Studia: oceny 2–5, ECTS' +

            '</option>' +

            '</select>' +

            '</div>';


        if (!isNaN(tg)) {

            var W = 0;
            var T = 0;


            S.grades.forEach(function(g) {

                var v = pg(g.real);
                var x = parseFloat(g.w) || 1;

                if (!isNaN(v)) {
                    T += v * x;
                    W += x;
                }
            });


            var cw =
                parseFloat(S.cw) || 1;

            var nd =
                (tg * (W + cw) - T) / cw;

            var mx =
                S.mode == 'uni' ?
                5 :
                6;

            var mn =
                S.mode == 'uni' ?
                2 :
                1;


            h +=
                '<h2>Ile potrzebuję?</h2>' +

                '<div class="row">' +

                '<input ' +
                'id="cw" ' +
                'type="number" ' +
                'placeholder="' +
                (
                    S.mode == 'uni' ?
                    'ECTS' :
                    'Waga'
                ) +
                ' kolejnej oceny" ' +
                'value="' +
                esc(S.cw || '') +
                '">' +

                '</div>' +

                '<p><b>' +

                (
                    nd > mx ?
                    'Samą kolejną oceną nie dojdziesz do celu (potrzeba ' +
                    nd.toFixed(2) +
                    ').'

                    :
                    nd <= mn ?
                    'Cel masz już zapewniony, wystarczy najniższa ocena.'

                    :
                    'Aby mieć ' +
                    tg +
                    ', następna ocena musi wynosić co najmniej ' +
                    (
                        Math.ceil(nd * 4) / 4
                    ).toFixed(2) +
                    '.'
                ) +

                '</b></p>';
        }


        h +=
            '<h2>Dodaj ocenę</h2>' +

            '<div class="row">' +

            '<input ' +
            'id="a1" ' +
            'placeholder="Przedmiot">' +

            '<input ' +
            'id="a2" ' +
            'placeholder="Za co (np. sprawdzian)">' +

            '<input ' +
            'id="a4" ' +
            'type="text" ' +
            'placeholder="Chcę" ' +
            'class="g">' +

            '<input ' +
            'id="a5" ' +
            'type="text" ' +
            'placeholder="Mam" ' +
            'class="g">' +

            '<input ' +
            'id="a6" ' +
            'type="number" ' +
            'placeholder="' +
            (
                S.mode == 'uni' ?
                'ECTS' :
                'Waga'
            ) +
            '" class="g">' +

            '<button ' +
            'class="btn" ' +
            'data-add="grades">' +

            'Dodaj' +

            '</button>' +

            '</div>';


        h +=
            S.grades
            .map(function(g) {

                return (

                    '<div class="item">' +

                    '<div class="t">' +

                    '<b>' +
                    esc(g.subj) +
                    '</b> ' +

                    '<small>' +
                    esc(g.name) +
                    ' · waga ' +
                    esc(g.w || 1) +
                    '</small>' +

                    '</div>' +

                    '<small>chcę</small>' +

                    '<input ' +
                    'class="g" ' +
                    'type="text" ' +
                    'value="' +
                    esc(g.plan) +
                    '" ' +
                    'data-f="plan" ' +
                    'data-id="' +
                    g.id +
                    '">' +

                    '<small>mam</small>' +

                    '<input ' +
                    'class="g" ' +
                    'type="text" ' +
                    'value="' +
                    esc(g.real) +
                    '" ' +
                    'data-f="real" ' +
                    'data-id="' +
                    g.id +
                    '">' +

                    '<button ' +
                    'class="x" ' +
                    'data-del="grades" ' +
                    'data-id="' +
                    g.id +
                    '">' +

                    '✕' +

                    '</button>' +

                    '</div>'
                );
            })
            .join('') ||

            '<p class="mut">' +
            'Brak ocen.' +
            '</p>';


        var by = {};

        S.grades.forEach(function(g) {

            (
                by[g.subj] =
                by[g.subj] || []
            ).push({
                v: val(g),
                w: g.w
            });
        });


        var ks = Object.keys(by);

        if (ks.length) {

            h +=
                '<h2>Średnie z przedmiotów</h2>' +

                ks.map(function(k) {

                    return (

                        '<div class="item">' +

                        '<div class="t">' +
                        esc(k) +
                        '</div>' +

                        '<b>' +
                        f(avg(by[k])) +
                        '</b>' +

                        '</div>'
                    );
                }).join('');
        }


        h +=
            '<p class="mut">' +

            'Oceny wpisuj np. 4, 4+ (=4,5) lub 5- (=4,75). ' +

            'Wpisz „mam”, a ocena zastąpi planowaną.' +

            '</p>';
    }


    /* =========================
       NOTATKI
    ========================= */

    if (S.tab == 'notes') {

        h =
            '<div class="nl">' +

            S.notes
            .map(function(n) {

                return (

                    '<button ' +
                    'data-note="' +
                    n.id +
                    '" ' +
                    'class="' +
                    (
                        S.note == n.id ?
                        'on' :
                        ''
                    ) +
                    '">' +

                    esc(
                        n.title ||
                        'Bez tytułu'
                    ) +

                    '</button>'
                );
            })
            .join('') +

            '<button ' +
            'class="btn" ' +
            'data-newnote="1">' +

            '+ Nowa' +

            '</button>' +

            '</div>';


        var n =
            S.notes.filter(function(x) {
                return x.id == S.note;
            })[0];


        if (n) {

            h +=

                '<div class="nb">' +

                '<input ' +
                'id="nt" ' +
                'placeholder="Tytuł" ' +
                'value="' +
                esc(n.title) +
                '">' +

                '<textarea ' +
                'id="nb" ' +
                'placeholder="Zacznij pisać...">' +

                esc(n.body) +

                '</textarea>' +

                '</div>' +

                '<div class="row" style="margin-top:12px">' +

                '<button ' +
                'data-del="notes" ' +
                'data-id="' +
                n.id +
                '">' +

                'Usuń notatkę' +

                '</button>' +

                '</div>' +

                '<p class="mut">' +
                'Zapisuje się automatycznie.' +
                '</p>';

        } else {

            h +=
                '<p class="mut">' +
                'Wybierz lub utwórz notatkę.' +
                '</p>';
        }
    }


    /* =========================
       NAGŁÓWEK
    ========================= */

    var HD = {

        cal: [
            'Kalendarz',
            'Kliknij dzień, aby dodać wpis'
        ],

        week: [
            'Tydzień',
            'Plan całego tygodnia w jednym miejscu'
        ],

        plan: [
            'Plan lekcji',
            'Twój tydzień w jednym miejscu'
        ],

        tests: [
            'Sprawdziany',
            'Zaplanuj, z czego i kiedy piszesz'
        ],

        goals: [
            'Cele',
            'Co chcesz osiągnąć i do kiedy'
        ],

        grades: [
            'Oceny',
            'Ustaw cel i śledź swoją średnią'
        ],

        notes: [
            'Notatki',
            'Twój zeszyt, zapisuje się sam'
        ]

    }[S.tab];


    $('v').innerHTML =

        quickAddBox() +

        '<div class="card">' +

        '<div class="ch">' +

        '<b>' +
        HD[0] +
        '</b>' +

        '<span>' +
        HD[1] +
        '</span>' +

        '</div>' +

        h +

        '</div>';
}


/* =========================
   KLIKNIĘCIA
========================= */

document.addEventListener('click', function(e) {

    var t = e.target;

    var a;

    var dd =
        t.closest &&
        t.closest('[data-day]');


    /* QUICK ADD */

    if (t.dataset.quick) {

        var qm = $('quickMenu');

        if (qm) {
            qm.classList.toggle('show');
        }

        return;
    }


    if (t.dataset.quicktype) {

        var type =
            t.dataset.quicktype;


        if (type == 'task') {
            S.tab = 'goals';
        }

        if (type == 'test') {
            S.tab = 'tests';
        }

        if (type == 'goal') {
            S.tab = 'goals';
        }

        if (type == 'grade') {
            S.tab = 'grades';
        }

        if (type == 'holiday') {
            S.tab = 'cal';
        }

        if (type == 'note') {
            S.tab = 'notes';
        }

        save();
        render();

        return;
    }


    /* ZMIANA TYGODNIA */

    if (t.dataset.week) {

        var ws =
            S.week ?
            parseDateKey(S.week) :
            weekStart(N);

        ws.setDate(
            ws.getDate() +
            Number(t.dataset.week) * 7
        );

        S.week = dateKey(ws);

        save();
        render();

        return;
    }

    /* USUŃ PUNKT CHECKLISTY */

    if (t.dataset.delcheck) {

        var testToEdit =
            S.tests.filter(function(x) {
                return x.id == t.dataset.delcheck;
            })[0];

        if (!testToEdit) return;

        testToEdit.checklist =
            (testToEdit.checklist || [])
            .filter(function(x) {
                return x.id != t.dataset.checkid;
            });

        save();
        render();

        return;
    }

    /* CHECKLISTA - DODAJ PUNKT */

    if (t.dataset.addcheck) {

        var test =
            S.tests.filter(function(x) {
                return (
                    x.id ==
                    t.dataset.addcheck
                );
            })[0];


        if (!test) return;


        var text = prompt(
            'Co musisz umieć na ten sprawdzian?'
        );


        if (!text || !text.trim()) {
            return;
        }


        test.checklist =
            test.checklist || [];


        test.checklist.push({

            id: id(),

            text: text.trim(),

            done: false

        });


        save();
        render();

        return;
    }


    /* OTWÓRZ CHECKLISTĘ */

    if (t.dataset.checklist) {

        var test2 =
            S.tests.filter(function(x) {
                return (
                    x.id ==
                    t.dataset.checklist
                );
            })[0];


        if (!test2) return;


        var text2 = prompt(
            'Dodaj punkt do zakresu sprawdzianu:'
        );


        if (!text2 || !text2.trim()) {
            return;
        }


        test2.checklist =
            test2.checklist || [];


        test2.checklist.push({

            id: id(),

            text: text2.trim(),

            done: false

        });


        save();
        render();

        return;
    }


    /* KLIKNIĘCIE DNIA */

    if (dd) {

        S.sel =
            dd.dataset.day;

        save();
        render();

        var form =
            $('dayform');

        if (
            form &&
            form.scrollIntoView
        ) {

            form.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }

        return;
    }


    /* DODAJ LEKCJĘ */

    if (t.dataset.addl) {

        var sj =
            $('a1').value.trim();

        if (!sj) return;


        S.lessons.push({

            id: id(),

            day: Number(
                $('a7').value
            ),

            time: $('a3').value,

            subj: sj,

            room: $('a2').value.trim()

        });


        save();
        render();

        return;
    }


    /* DODAJ DZIEŃ WOLNY */

    if (t.dataset.addholiday) {

        var name =
            $('holidayName')
            .value
            .trim();

        if (!name) return;


        var startDate =
            S.sel;

        var endDate =
            $('holidayEnd').value ||
            S.sel;


        if (endDate < startDate) {

            alert(
                'Data końcowa nie może być wcześniejsza niż początkowa.'
            );

            return;
        }


        /* Usuwamy każdy istniejący
           zakres nachodzący na wybrany dzień */

        S.holidays =
            S.holidays.filter(function(h) {

                var hs = h.date;
                var he =
                    h.endDate ||
                    h.date;

                return !(
                    startDate <= he &&
                    endDate >= hs
                );
            });


        S.holidays.push({

            id: id(),

            date: startDate,

            endDate: endDate,

            name: name

        });


        save();
        render();

        return;
    }


    /* USUŃ DZIEŃ WOLNY */

    if (t.dataset.delholiday) {

        S.holidays =
            S.holidays.filter(function(h) {

                var hs = h.date;
                var he =
                    h.endDate ||
                    h.date;

                return !(
                    S.sel >= hs &&
                    S.sel <= he
                );
            });


        save();
        render();

        return;
    }


    /* EKSPORT */

    if (t.dataset.exp) {

        $('bk').value =
            JSON.stringify(S);

        $('bk').select();

        return;
    }


    /* IMPORT */

    if (t.dataset.imp) {

        try {

            var o =
                JSON.parse(
                    $('bk').value
                );


            for (var k in o) {
                S[k] = o[k];
            }


            if (!S.holidays) {
                S.holidays = [];
            }


            save();
            render();


            $('bk').value =
                'Wczytano!';

        } catch (e) {

            $('bk').value =
                'Błąd: nieprawidłowa kopia';
        }

        return;
    }


    /* ZAMKNIJ DZIEŃ */

    if (t.dataset.closeday) {

        S.sel = null;

        save();
        render();

        return;
    }


    /* DODAJ WPIS DO DNIA */

    if (t.dataset.addday) {

        var sj2 =
            $('a1').value.trim();

        if (!sj2) return;


        var typ =
            $('a7').value;


        if (typ == 'tests') {

            S.tests.push({

                id: id(),

                subj: sj2,

                topic: $('a2').value.trim(),

                date: S.sel,

                priority: 'normal',

                done: false,

                checklist: []

            });

        } else {

            S.goals.push({

                id: id(),

                subj: sj2,

                topic: $('a2').value.trim(),

                date: S.sel,

                priority: 'normal',

                done: false

            });
        }


        save();
        render();

        return;
    }


    /* ZMIANA MIESIĄCA */

    if (a = t.dataset.cal) {

        var c = S.cal;

        c.m += Number(a);


        if (c.m > 11) {

            c.m = 0;
            c.y++;
        }


        if (c.m < 0) {

            c.m = 11;
            c.y--;
        }


        save();
        render();

        return;
    }


    /* ZMIANA ZAKŁADKI */

    if (a = t.dataset.tab) {

        S.tab = a;

        save();
        render();

        return;
    }


    /* DODAWANIE */

    if (a = t.dataset.add) {

        var v = function(i) {

            return $(i) ?
                $(i).value.trim() :
                '';
        };


        if (!v('a1')) return;


        if (a == 'grades') {

            S.grades.push({

                id: id(),

                subj: v('a1'),

                name: v('a2'),

                plan: v('a4'),

                real: v('a5'),

                w: v('a6') || 1

            });

        } else {

            S[a].push({

                id: id(),

                subj: v('a1'),

                topic: v('a2'),

                date: v('a3'),

                priority: v('a8') || 'normal',

                done: false,

                checklist: a == 'tests' ? [] : undefined

            });
        }


        save();
        render();

        return;
    }


    /* USUWANIE */

    if (a = t.dataset.del) {

        S[a] =
            S[a].filter(function(x) {

                return (
                    x.id !=
                    t.dataset.id
                );
            });


        if (a == 'notes') {
            S.note = null;
        }


        save();
        render();

        return;
    }


    /* NOTATKA */

    if (a = t.dataset.note) {

        S.note =
            a;

        save();
        render();

        return;
    }


    /* NOWA NOTATKA */

    if (t.dataset.newnote) {

        var note = {

            id: id(),

            title: '',

            body: ''

        };


        S.notes.push(note);

        S.note =
            note.id;


        save();
        render();

        return;
    }
});


/* =========================
   CHANGE
========================= */

document.addEventListener('change', function(e) {

    var t = e.target;

    var a;


    /* CHECKLISTA */

    if (t.dataset.check) {

        var test =
            S.tests.filter(function(x) {

                return (
                    x.id ==
                    t.dataset.check
                );

            })[0];


        if (!test) return;


        var check =
            (test.checklist || [])
            .filter(function(x) {

                return (
                    x.id ==
                    t.dataset.checkid
                );

            })[0];


        if (!check) return;


        check.done =
            t.checked;


        save();
        render();

        return;
    }


    /* CHECKBOX */

    if (a = t.dataset.done) {

        S[a].forEach(function(x) {

            if (
                x.id ==
                t.dataset.id
            ) {

                x.done =
                    t.checked;
            }
        });


        save();
        render();

        return;
    }


    /* OCENY */

    if (a = t.dataset.f) {

        S.grades.forEach(function(x) {

            if (
                x.id ==
                t.dataset.id
            ) {

                x[a] =
                    t.value;
            }
        });


        save();
        render();

        return;
    }


    /* TRYB OCEN */

    if (t.id == 'md') {

        S.mode =
            t.value;

        save();
        render();

        return;
    }


    /* WAGA */

    if (t.id == 'cw') {

        S.cw =
            t.value;

        save();
        render();

        return;
    }


    /* CEL ŚREDNIEJ */

    if (t.id == 'tg') {

        S.target =
            t.value;

        save();
        render();

        return;
    }
});


/* =========================
   INPUT
========================= */

document.addEventListener('input', function(e) {

    var t = e.target;


    if (
        t.id == 'nt' ||
        t.id == 'nb'
    ) {

        S.notes.forEach(function(n) {

            if (
                n.id ==
                S.note
            ) {

                if (t.id == 'nt') {

                    n.title =
                        t.value;

                } else {

                    n.body =
                        t.value;
                }
            }
        });


        save();
    }
});


/* =========================
   START
========================= */

render();