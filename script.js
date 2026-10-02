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
  sel: null
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

    if (
      h.date &&
      h.date.indexOf(String(y) + '-') === 0
    ) {
      H[h.date] = h.name;
    }

  });

  return H;
}


/* =========================
   PLAN LEKCJI NA DZIŚ
========================= */

function todayBar() {

  var dw = (N.getDay() + 6) % 7;

  var L = S.lessons
    .filter(function(l) {
      return l.day == dw;
    })
    .sort(function(a, b) {
      return a.time > b.time ? 1 : -1;
    });

  return L.length
    ? '<div class="box" style="display:block">' +
        '<b>Dziś:</b> ' +
        L.map(function(l) {
          return esc(l.time) +
            ' ' +
            esc(l.subj) +
            (l.room
              ? ' (' + esc(l.room) + ')'
              : '');
        }).join(' · ') +
      '</div>'
    : '';
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
   SKRÓT DO ELEMENTU
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

  var w = 0,
      s = 0;

  a.forEach(function(g) {

    var v = pg(g.v),
        x = parseFloat(g.w) || 1;

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
  return n == null
    ? '–'
    : n.toFixed(2);
}


function days(d) {

  var n = Math.ceil(
    (
      new Date(d) -
      new Date().setHours(0, 0, 0, 0)
    ) / 864e5
  );

  return n < 0
    ? 'minął'
    : n == 0
      ? 'dziś'
      : n == 1
        ? 'jutro'
        : 'za ' + n + ' dni';
}


function val(g) {
  return g.real !== '' &&
         g.real != null
    ? g.real
    : g.plan;
}


/* =========================
   RENDER
========================= */

function render() {

  $('nav').innerHTML =
    Object.keys(TABS).map(function(t) {

      return '<button data-tab="' + t +
        '" class="' +
        (S.tab == t ? 'on' : '') +
        '">' +
        TABS[t] +
        '</button>';

    }).join('');

  var h = '';


  /* =========================
     KALENDARZ
  ========================= */

  if (S.tab == 'cal') {

    var y = S.cal.y,
        m = S.cal.m,

        fi = (
          new Date(y, m, 1).getDay() + 6
        ) % 7,

        dim = new Date(
          y,
          m + 1,
          0
        ).getDate(),

        ev = {},

        HL = hols(y),

        CH = customHols(y),

        p2 = function(n) {
          return ('0' + n).slice(-2);
        };


    /* SPRAWDZIANY */

    S.tests.forEach(function(t) {

      if (t.date) {

        (ev[t.date] =
          ev[t.date] || []
        ).push(
          '<b>' +
          esc(t.subj) +
          '</b>'
        );

      }

    });


    /* CELE */

    S.goals.forEach(function(t) {

      if (t.date) {

        (ev[t.date] =
          ev[t.date] || []
        ).push(
          '<u>' +
          esc(t.subj) +
          '</u>'
        );

      }

    });


    /* NAGŁÓWEK */

    h =
      todayBar() +

      '<div class="cn">' +

        '<button data-cal="-1">‹</button>' +

        '<h3>' +
          [
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

        '<button data-cal="1">›</button>' +

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
        ].map(function(x) {

          return '<div class="dh">' +
            x +
            '</div>';

        }).join('');


    /* PUSTE DNI */

    for (var i = 0; i < fi; i++) {
      h += '<div class="d e"></div>';
    }


    /* DNI MIESIĄCA */

    for (var d = 1; d <= dim; d++) {

      var K =
        y +
        '-' +
        p2(m + 1) +
        '-' +
        p2(d);

      var L = ev[K] || [];

      var td =
        d == N.getDate() &&
        m == N.getMonth() &&
        y == N.getFullYear();

      var holidayName =
        CH[K] || HL[K];


      h +=
        '<div data-day="' +
        K +
        '" class="d' +

        (td ? ' td' : '') +

        (S.sel == K ? ' sel' : '') +

        (holidayName ? ' hd' : '') +

        '"' +

        (
          holidayName
            ? ' title="' +
              esc(holidayName) +
              '"'
            : ''
        ) +

        '>' +

          '<span>' +
            d +
          '</span>' +

          (
            holidayName
              ? '<u>' +
                esc(holidayName) +
                '</u>'
              : ''
          ) +

          L.slice(0, 2).join('') +

          (
            L.length > 2
              ? '<i>+' +
                (L.length - 2) +
                '</i>'
              : ''
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
              selectedHoliday
                ? ' <small class="mut">' +
                  esc(selectedHoliday) +
                  '</small>'
                : ''
            ) +

          '</h2>';


      /* =========================
         DZIEŃ WOLNY
      ========================= */

      h +=
        '<div class="row">' +

          '<input ' +
            'id="holidayName" ' +
            'placeholder="Nazwa dnia wolnego" ' +
            'value="' +
              (
                CH[S.sel]
                  ? esc(CH[S.sel])
                  : ''
              ) +
            '">' +

          '<button ' +
            'class="btn" ' +
            'data-addholiday="1">' +
            (
              CH[S.sel]
                ? 'Zmień dzień wolny'
                : 'Ustaw dzień wolny'
            ) +
          '</button>' +

          (
            CH[S.sel]
              ? '<button data-delholiday="1">' +
                'Usuń dzień wolny' +
                '</button>'
              : ''
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
                    o.x.topic
                      ? ' · ' +
                        esc(o.x.topic)
                      : ''
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

        }).join('');


      /* =========================
         DODAWANIE SPRAWDZIANU/CELU
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
                i == tdw
                  ? ' selected'
                  : ''
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
            return l.day == i;
          })
          .sort(function(a, b) {
            return a.time > b.time
              ? 1
              : -1;
          });


      if (i > 4 && !L.length) {
        return;
      }


      h +=
        '<h2>' +
          n +
          (
            i == tdw
              ? ' · dziś'
              : ''
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

        '<input id="a1" placeholder="Przedmiot">' +

        '<input ' +
          'id="a2" ' +
          'placeholder="Zakres / temat">' +

        '<input id="a3" type="date">' +

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

          return (

            '<div class="item ' +
              (t.done ? 'done' : '') +
            '">' +

              '<input ' +
                'type="checkbox" ' +
                'data-done="tests" ' +
                'data-id="' +
                  t.id +
                '"' +
                (
                  t.done
                    ? ' checked'
                    : ''
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

              '</div>' +

              (
                t.date
                  ? '<span class="bd">' +
                    days(t.date) +
                    '</span>'
                  : ''
              ) +

              '<button ' +
                'class="x" ' +
                'data-del="tests" ' +
                'data-id="' +
                  t.id +
                '">' +
                '✕' +
              '</button>' +

            '</div>'

          );

        }).join('') ||

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
            '">' +

              '<input ' +
                'type="checkbox" ' +
                'data-done="goals" ' +
                'data-id="' +
                  t.id +
                '"' +
                (
                  t.done
                    ? ' checked'
                    : ''
                ) +
              '>' +

              '<div class="t">' +

                esc(t.subj) +

                (
                  t.date
                    ? '<br><small>do ' +
                      esc(t.date) +
                      ' · ' +
                      days(t.date) +
                      '</small>'
                    : ''
                ) +

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

        }).join('') ||

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
          return g.real !== '' &&
                 g.real != null;
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


    var tg = parseFloat(S.target);

    var diff =
      !isNaN(tg) &&
      pro != null
        ? pro - tg
        : null;


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
          diff >= 0
            ? 'Jesteś na dobrej drodze: ' +
              diff.toFixed(2) +
              ' powyżej celu.'
            : 'Brakuje ' +
              (-diff).toFixed(2) +
              ' do celu.'
        ) +

        '</b></p>';

    }


    h +=

      '<div class="row">' +

        '<select id="md">' +

          '<option value="school"' +
            (S.mode == 'uni'
              ? ''
              : ' selected') +
          '>' +
            'Szkoła: oceny 1–6, plus i minus' +
          '</option>' +

          '<option value="uni"' +
            (S.mode == 'uni'
              ? ' selected'
              : '') +
          '>' +
            'Studia: oceny 2–5, ECTS' +
          '</option>' +

        '</select>' +

      '</div>';


    if (!isNaN(tg)) {

      var W = 0,
          T = 0;


      S.grades.forEach(function(g) {

        var v = pg(g.real),
            x = parseFloat(g.w) || 1;

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
        S.mode == 'uni'
          ? 5
          : 6;

      var mn =
        S.mode == 'uni'
          ? 2
          : 1;


      h +=

        '<h2>Ile potrzebuję?</h2>' +

        '<div class="row">' +

          '<input ' +
            'id="cw" ' +
            'type="number" ' +
            'placeholder="' +
              (
                S.mode == 'uni'
                  ? 'ECTS'
                  : 'Waga'
              ) +
              ' kolejnej oceny" ' +
            'value="' +
              esc(S.cw || '') +
            '">' +

        '</div>' +

        '<p><b>' +

        (
          nd > mx
            ? 'Samą kolejną oceną nie dojdziesz do celu (potrzeba ' +
              nd.toFixed(2) +
              ').'

            : nd <= mn
              ? 'Cel masz już zapewniony, wystarczy najniższa ocena.'

              : 'Aby mieć ' +
                tg +
                ', następna ocena musi wynosić co najmniej ' +
                (Math.ceil(nd * 4) / 4).toFixed(2) +
                '.'
        ) +

        '</b></p>';

    }


    h +=

      '<h2>Dodaj ocenę</h2>' +

      '<div class="row">' +

        '<input id="a1" placeholder="Przedmiot">' +

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
              S.mode == 'uni'
                ? 'ECTS'
                : 'Waga'
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

        }).join('') ||

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

        S.notes.map(function(n) {

          return (

            '<button ' +
              'data-note="' +
                n.id +
              '" ' +
              'class="' +
                (S.note == n.id ? 'on' : '') +
              '">' +

              esc(
                n.title ||
                'Bez tytułu'
              ) +

            '</button>'

          );

        }).join('') +

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

  var t = e.target,
      a,
      dd = t.closest &&
           t.closest('[data-day]');


  /* KLIKNIĘCIE DNIA */

  if (dd) {

    S.sel = dd.dataset.day;

    save();
    render();

    var f = $('dayform');

    if (
      f &&
      f.scrollIntoView
    ) {

      f.scrollIntoView({
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

      day:
        Number(
          $('a7').value
        ),

      time:
        $('a3').value,

      subj:
        sj,

      room:
        $('a2').value.trim()

    });

    save();
    render();

    return;
  }


  /* DODAJ DZIEŃ WOLNY */

  if (t.dataset.addholiday) {

    var name =
      $('holidayName').value.trim();

    if (!name) return;


    /* jeśli dzień już istnieje,
       zastępujemy jego nazwę */

    S.holidays =
      S.holidays.filter(function(h) {
        return h.date !== S.sel;
      });


    S.holidays.push({

      id: id(),

      date:
        S.sel,

      name:
        name

    });


    save();
    render();

    return;
  }


  /* USUŃ DZIEŃ WOLNY */

  if (t.dataset.delholiday) {

    S.holidays =
      S.holidays.filter(function(h) {
        return h.date !== S.sel;
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

    var sj =
      $('a1').value.trim();

    if (!sj) return;


    S[
      $('a7').value
    ].push({

      id: id(),

      subj:
        sj,

      topic:
        $('a2').value.trim(),

      date:
        S.sel,

      done:
        false

    });


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

  }


  /* ZMIANA ZAKŁADKI */

  else if (a = t.dataset.tab) {

    S.tab = a;

    save();
    render();

  }


  /* DODAWANIE */

  else if (a = t.dataset.add) {

    var v = function(i) {

      return $(i)
        ? $(i).value.trim()
        : '';

    };


    if (!v('a1')) return;


    if (a == 'grades') {

      S.grades.push({

        id: id(),

        subj:
          v('a1'),

        name:
          v('a2'),

        plan:
          v('a4'),

        real:
          v('a5'),

        w:
          v('a6') || 1

      });

    } else {

      S[a].push({

        id: id(),

        subj:
          v('a1'),

        topic:
          v('a2'),

        date:
          v('a3'),

        done:
          false

      });

    }


    save();
    render();

  }


  /* USUWANIE */

  else if (a = t.dataset.del) {

    S[a] =
      S[a].filter(function(x) {
        return x.id != t.dataset.id;
      });


    if (a == 'notes') {
      S.note = null;
    }


    save();
    render();

  }


  /* NOTATKA */

  else if (a = t.dataset.note) {

    S.note =
      Number(a);

    save();
    render();

  }


  /* NOWA NOTATKA */

  else if (t.dataset.newnote) {

    var n = {

      id: id(),

      title: '',

      body: ''

    };


    S.notes.push(n);

    S.note = n.id;

    save();
    render();

  }

});


/* =========================
   CHANGE
========================= */

document.addEventListener('change', function(e) {

  var t = e.target,
      a;


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

  }


  /* OCENY */

  else if (a = t.dataset.f) {

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

  }


  /* TRYB OCEN */

  else if (t.id == 'md') {

    S.mode =
      t.value;

    save();
    render();

  }


  /* WAGA */

  else if (t.id == 'cw') {

    S.cw =
      t.value;

    save();
    render();

  }


  /* CEL ŚREDNIEJ */

  else if (t.id == 'tg') {

    S.target =
      t.value;

    save();
    render();

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
          n.title = t.value;
        } else {
          n.body = t.value;
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