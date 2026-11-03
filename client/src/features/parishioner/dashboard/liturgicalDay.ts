/**
 * The day in the Roman calendar as kept in the Philippines: the season and week, Sundays, solemnities, feasts and
 * obligatory memorials, with the Philippine dates (Epiphany, Ascension and Corpus Christi on Sundays, the Santo
 * Niño, San Pedro Calungsod, San Lorenzo Ruiz). Optional memorials are left out, and a solemnity that falls on a
 * privileged Sunday or in Holy Week shows that day instead of being moved.
 */

export type LiturgicalColor = "green" | "violet" | "rose" | "white" | "red";

export interface LiturgicalDay {
  /** "Memorial of St Charles Borromeo", "31st Sunday in Ordinary Time", "Week 31 in Ordinary Time". */
  name: string;
  season: "Advent" | "Christmas" | "Ordinary Time" | "Lent" | "Holy Week" | "Easter";
  color: LiturgicalColor;
}

type Rank = "solemnity" | "feast" | "memorial";
type Celebration = [name: string, rank: Rank, color: LiturgicalColor];

const W = "white";
const R = "red";

/** Fixed dates of the General Roman Calendar and the Philippine proper, by "MM-DD". */
const FIXED: Record<string, Celebration> = {
  "01-01": ["Mary, the Holy Mother of God", "solemnity", W],
  "01-02": ["Sts Basil the Great and Gregory Nazianzen", "memorial", W],
  "01-17": ["St Anthony, Abbot", "memorial", W],
  "01-21": ["St Agnes", "memorial", R],
  "01-24": ["St Francis de Sales", "memorial", W],
  "01-25": ["The Conversion of St Paul", "feast", W],
  "01-26": ["Sts Timothy and Titus", "memorial", W],
  "01-28": ["St Thomas Aquinas", "memorial", W],
  "01-31": ["St John Bosco", "memorial", W],
  "02-02": ["The Presentation of the Lord", "feast", W],
  "02-05": ["St Agatha", "memorial", R],
  "02-06": ["Sts Paul Miki and Companions", "memorial", R],
  "02-10": ["St Scholastica", "memorial", W],
  "02-14": ["Sts Cyril and Methodius", "memorial", W],
  "02-22": ["The Chair of St Peter", "feast", W],
  "03-19": ["St Joseph, Spouse of the Blessed Virgin Mary", "solemnity", W],
  "03-25": ["The Annunciation of the Lord", "solemnity", W],
  "04-02": ["St Pedro Calungsod", "memorial", R],
  "04-07": ["St John Baptist de la Salle", "memorial", W],
  "04-11": ["St Stanislaus", "memorial", R],
  "04-25": ["St Mark, Evangelist", "feast", R],
  "04-29": ["St Catherine of Siena", "memorial", W],
  "05-02": ["St Athanasius", "memorial", W],
  "05-03": ["Sts Philip and James, Apostles", "feast", R],
  "05-14": ["St Matthias, Apostle", "feast", R],
  "05-26": ["St Philip Neri", "memorial", W],
  "05-31": ["The Visitation of the Blessed Virgin Mary", "feast", W],
  "06-01": ["St Justin", "memorial", R],
  "06-03": ["Sts Charles Lwanga and Companions", "memorial", R],
  "06-11": ["St Barnabas, Apostle", "memorial", R],
  "06-13": ["St Anthony of Padua", "memorial", W],
  "06-21": ["St Aloysius Gonzaga", "memorial", W],
  "06-24": ["The Nativity of St John the Baptist", "solemnity", W],
  "06-28": ["St Irenaeus", "memorial", R],
  "06-29": ["Sts Peter and Paul, Apostles", "solemnity", R],
  "07-03": ["St Thomas, Apostle", "feast", R],
  "07-11": ["St Benedict", "memorial", W],
  "07-15": ["St Bonaventure", "memorial", W],
  "07-22": ["St Mary Magdalene", "feast", W],
  "07-25": ["St James, Apostle", "feast", R],
  "07-26": ["Sts Joachim and Anne", "memorial", W],
  "07-29": ["Sts Martha, Mary and Lazarus", "memorial", W],
  "07-31": ["St Ignatius of Loyola", "memorial", W],
  "08-01": ["St Alphonsus Liguori", "memorial", W],
  "08-04": ["St John Vianney", "memorial", W],
  "08-06": ["The Transfiguration of the Lord", "feast", W],
  "08-08": ["St Dominic", "memorial", W],
  "08-10": ["St Lawrence", "feast", R],
  "08-11": ["St Clare", "memorial", W],
  "08-14": ["St Maximilian Kolbe", "memorial", R],
  "08-15": ["The Assumption of the Blessed Virgin Mary", "solemnity", W],
  "08-20": ["St Bernard", "memorial", W],
  "08-21": ["St Pius X", "memorial", W],
  "08-22": ["The Queenship of the Blessed Virgin Mary", "memorial", W],
  "08-24": ["St Bartholomew, Apostle", "feast", R],
  "08-27": ["St Monica", "memorial", W],
  "08-28": ["St Augustine", "memorial", W],
  "08-29": ["The Passion of St John the Baptist", "memorial", R],
  "09-03": ["St Gregory the Great", "memorial", W],
  "09-08": ["The Nativity of the Blessed Virgin Mary", "feast", W],
  "09-13": ["St John Chrysostom", "memorial", W],
  "09-14": ["The Exaltation of the Holy Cross", "feast", R],
  "09-15": ["Our Lady of Sorrows", "memorial", W],
  "09-16": ["Sts Cornelius and Cyprian", "memorial", R],
  "09-20": ["Sts Andrew Kim Tae-gon, Paul Chong Ha-sang and Companions", "memorial", R],
  "09-21": ["St Matthew, Apostle and Evangelist", "feast", R],
  "09-23": ["St Pius of Pietrelcina", "memorial", W],
  "09-27": ["St Vincent de Paul", "memorial", W],
  "09-28": ["St Lorenzo Ruiz and Companions", "memorial", R],
  "09-29": ["Sts Michael, Gabriel and Raphael, Archangels", "feast", W],
  "09-30": ["St Jerome", "memorial", W],
  "10-01": ["St Thérèse of the Child Jesus", "memorial", W],
  "10-02": ["The Holy Guardian Angels", "memorial", W],
  "10-04": ["St Francis of Assisi", "memorial", W],
  "10-07": ["Our Lady of the Rosary", "memorial", W],
  "10-15": ["St Teresa of Jesus", "memorial", W],
  "10-17": ["St Ignatius of Antioch", "memorial", R],
  "10-18": ["St Luke, Evangelist", "feast", R],
  "10-28": ["Sts Simon and Jude, Apostles", "feast", R],
  "11-01": ["All Saints", "solemnity", W],
  "11-02": ["All Souls", "solemnity", "violet"],
  "11-04": ["St Charles Borromeo", "memorial", W],
  "11-09": ["The Dedication of the Lateran Basilica", "feast", W],
  "11-10": ["St Leo the Great", "memorial", W],
  "11-11": ["St Martin of Tours", "memorial", W],
  "11-12": ["St Josaphat", "memorial", R],
  "11-17": ["St Elizabeth of Hungary", "memorial", W],
  "11-21": ["The Presentation of the Blessed Virgin Mary", "memorial", W],
  "11-22": ["St Cecilia", "memorial", R],
  "11-24": ["Sts Andrew Dung-Lac and Companions", "memorial", R],
  "11-30": ["St Andrew, Apostle", "feast", R],
  "12-03": ["St Francis Xavier", "memorial", W],
  "12-07": ["St Ambrose", "memorial", W],
  "12-08": ["The Immaculate Conception of the Blessed Virgin Mary", "solemnity", W],
  "12-13": ["St Lucy", "memorial", R],
  "12-14": ["St John of the Cross", "memorial", W],
  "12-25": ["The Nativity of the Lord", "solemnity", W],
  "12-26": ["St Stephen, the First Martyr", "feast", R],
  "12-27": ["St John, Apostle and Evangelist", "feast", W],
  "12-28": ["The Holy Innocents", "feast", R],
};

/** Feasts of the Lord, which take the place of a Sunday in Ordinary Time or Christmas. */
const FEASTS_OF_THE_LORD = new Set(["02-02", "08-06", "09-14", "11-09"]);

const DAY = 86_400_000;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Calendar dates as whole days, so daylight saving and time zones never shift them. */
function dayNumber(year: number, month: number, day: number) {
  return Math.round(Date.UTC(year, month - 1, day) / DAY);
}

function weekday(n: number) {
  return new Date(n * DAY).getUTCDay();
}

function sundayOnOrBefore(n: number) {
  return n - weekday(n);
}

function ordinal(n: number) {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${suffix}`;
}

/** Easter Sunday by the anonymous Gregorian computus. */
function easter(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return dayNumber(year, month, day);
}

function adventStart(year: number) {
  const christmas = dayNumber(year, 12, 25);
  const fourthSunday = christmas - (weekday(christmas) || 7);
  return fourthSunday - 21;
}

/** In the Philippines, the Epiphany is the Sunday between January 2 and 8. */
function epiphany(year: number) {
  const jan2 = dayNumber(year, 1, 2);
  return jan2 + ((7 - weekday(jan2)) % 7);
}

/** The Sunday after the Epiphany, or the Monday when the Epiphany falls on January 7 or 8. */
function baptismOfTheLord(year: number) {
  const ep = epiphany(year);
  return ep - dayNumber(year, 1, 1) >= 6 ? ep + 1 : ep + 7;
}

function holyFamily(year: number) {
  const dec26 = dayNumber(year, 12, 26);
  const sunday = dec26 + ((7 - weekday(dec26)) % 7);
  return sunday <= dayNumber(year, 12, 31) ? sunday : dayNumber(year, 12, 30);
}

function movable(n: number, year: number): Celebration | null {
  const e = easter(year);
  const entries: [number, Celebration][] = [
    [epiphany(year), ["The Epiphany of the Lord", "solemnity", W]],
    [baptismOfTheLord(year), ["The Baptism of the Lord", "feast", W]],
    [sundayOnOrBefore(dayNumber(year, 1, 21)), ["The Santo Niño (Holy Child Jesus)", "feast", W]],
    [e + 42, ["The Ascension of the Lord", "solemnity", W]],
    [e + 49, ["Pentecost Sunday", "solemnity", R]],
    [e + 50, ["Mary, Mother of the Church", "memorial", W]],
    [e + 56, ["The Most Holy Trinity", "solemnity", W]],
    [e + 63, ["The Most Holy Body and Blood of Christ", "solemnity", W]],
    [e + 68, ["The Most Sacred Heart of Jesus", "solemnity", W]],
    [e + 69, ["The Immaculate Heart of the Blessed Virgin Mary", "memorial", W]],
    [adventStart(year) - 7, ["Our Lord Jesus Christ, King of the Universe", "solemnity", W]],
    [holyFamily(year), ["The Holy Family of Jesus, Mary and Joseph", "feast", W]],
  ];
  return entries.find(([day]) => day === n)?.[1] ?? null;
}

function titled([name, rank]: Celebration) {
  if (rank === "memorial") return `Memorial of ${name}`;
  return name;
}

/** The liturgical day for a calendar date, read in local time. */
export function liturgicalDay(date = new Date()): LiturgicalDay {
  const year = date.getFullYear();
  const n = dayNumber(year, date.getMonth() + 1, date.getDate());
  const isSunday = weekday(n) === 0;
  const key = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const e = easter(year);
  const ashWednesday = e - 46;
  const pentecost = e + 49;
  const advent = adventStart(year);
  const baptism = baptismOfTheLord(year);
  const dayName = WEEKDAYS[weekday(n)];

  // The season and its own name for the day.
  let season: LiturgicalDay["season"];
  let seasonal: string;
  let color: LiturgicalColor;
  /** Sundays of Advent, Lent and Easter, which no fixed celebration displaces. */
  let privilegedSunday = false;
  /** Ash Wednesday, Holy Week and the Easter Octave, which no fixed celebration displaces. */
  let highDay = false;

  if (n >= advent && n < dayNumber(year, 12, 25)) {
    season = "Advent";
    const week = Math.floor((n - advent) / 7) + 1;
    seasonal = isSunday ? `${ordinal(week)} Sunday of Advent` : `${dayName} of the ${ordinal(week)} Week of Advent`;
    color = isSunday && week === 3 ? "rose" : "violet";
    privilegedSunday = isSunday;
  } else if (n >= dayNumber(year, 12, 25) || n <= baptism) {
    season = "Christmas";
    const octave = n >= dayNumber(year, 12, 25) && n <= dayNumber(year, 12, 31);
    seasonal = octave ? `${dayName} within the Octave of Christmas` : "Christmas Weekday";
    color = W;
  } else if (n < ashWednesday) {
    season = "Ordinary Time";
    const week = Math.floor((n - sundayOnOrBefore(baptism)) / 7) + 1;
    seasonal = isSunday ? `${ordinal(week)} Sunday in Ordinary Time` : `Week ${week} in Ordinary Time`;
    color = "green";
  } else if (n < e - 7) {
    season = "Lent";
    const firstSunday = ashWednesday + 4;
    if (n === ashWednesday) seasonal = "Ash Wednesday";
    else if (n < firstSunday) seasonal = `${dayName} after Ash Wednesday`;
    else {
      const week = Math.floor((n - firstSunday) / 7) + 1;
      seasonal = isSunday ? `${ordinal(week)} Sunday of Lent` : `${dayName} of the ${ordinal(week)} Week of Lent`;
    }
    color = isSunday && n === e - 21 ? "rose" : "violet";
    privilegedSunday = isSunday;
    highDay = n === ashWednesday;
  } else if (n < e) {
    season = "Holy Week";
    const names: Record<number, [string, LiturgicalColor]> = {
      [e - 7]: ["Palm Sunday of the Passion of the Lord", R],
      [e - 3]: ["Holy Thursday", W],
      [e - 2]: ["Good Friday of the Passion of the Lord", R],
      [e - 1]: ["Holy Saturday", "violet"],
    };
    [seasonal, color] = names[n] ?? [`${dayName} of Holy Week`, "violet"];
    highDay = true;
  } else if (n <= pentecost) {
    season = "Easter";
    const week = Math.floor((n - e) / 7) + 1;
    if (n === e) seasonal = "Easter Sunday of the Resurrection of the Lord";
    else if (n < e + 7) seasonal = `${dayName} within the Octave of Easter`;
    else if (n === e + 7) seasonal = "2nd Sunday of Easter (Divine Mercy Sunday)";
    else seasonal = isSunday ? `${ordinal(week)} Sunday of Easter` : `${dayName} of the ${ordinal(week)} Week of Easter`;
    color = W;
    privilegedSunday = isSunday;
    highDay = n < e + 7;
  } else {
    season = "Ordinary Time";
    const week = 34 - Math.round((advent - 7 - sundayOnOrBefore(n)) / 7);
    seasonal = isSunday ? `${ordinal(week)} Sunday in Ordinary Time` : `Week ${week} in Ordinary Time`;
    color = "green";
  }

  // A celebration takes the day when it outranks the season's own day. Movable ones (the Ascension, Pentecost,
  // the Holy Family, the Santo Niño...) are set on the day they belong to, so they always do.
  const moved = movable(n, year);
  const celebration = moved ?? FIXED[key] ?? null;
  if (celebration) {
    const [, rank, ownColor] = celebration;
    const lateAdvent = season === "Advent" && date.getMonth() === 11 && date.getDate() >= 17;
    const wins =
      moved !== null ||
      (rank === "solemnity" && !privilegedSunday && !highDay) ||
      (rank === "feast" && !highDay && (!isSunday || (FEASTS_OF_THE_LORD.has(key) && season === "Ordinary Time"))) ||
      (rank === "memorial" && !isSunday && !highDay && season !== "Lent" && season !== "Holy Week" && !lateAdvent);
    if (wins) return { name: titled(celebration), season, color: ownColor };
  }

  return { name: seasonal, season, color };
}
