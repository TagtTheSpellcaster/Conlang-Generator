// Verb frames and the cast for the text planner.
//
// A verb entry says which frame the verb takes and what kind of participant fits each role, so that the planner never writes
// "the stone ate the wolf":
//   kind  i  intransitive (agent)              t  transitive (agent, patient)         d  ditransitive (agent, patient, recipient)
//         m  motion to a goal (agent + a place after an adposition)                    c  takes a clause ("thought that ...") or a quotation
//         w  takes the verb of the same subject ("wanted to eat")
//   agent / patient: letters of the classes that fit. Classes of the cast:
//         h human   a animal   p place   b building (also a place)   d dwelling (a place where one lives)   o object   f solid food   w drink   n natural force   v plant
//         x = h + a (any being)
// English forms are kept with the entry (past tense: the planner writes in the past and in the present of dialogues).
const VERB_TABLE = `
i sleep slept x -
i laugh laughed h -
i cry cried h -
i sing sang xn -
i dance danced h -
i rest rested x -
i work worked h -
i die died x -
i fall fell xn -
i rise rose n -
i wake woke x -
i sit sat x -
i stand stood x -
i wander wandered x -
i hide hid x -
i wait waited x -
i pray prayed h -
i smile smiled h -
i hunt hunted h -
i fish fished h -
i farm farmed h -
i swim swam a -
i fly flew a -
i shout shouted h -
i live lived x -
m go went xn to
m come came xn to
m walk walked h to
m run ran x to
m travel traveled h to
m return returned x to
m arrive arrived xn at
t enter entered x pb
t leave left x pb
t cross crossed x p
t flee fled x pb
t follow followed x x
t see saw x xpbofwv
t hear heard x xn
t smell smelled x xfwo
t watch watched x xn
t meet met x x
t visit visited h hpb
t find found x ofw
t take took x ofw
t carry carried x of
t hold held x of
t keep kept h of
t lose lost h of
t eat ate x f
t drink drank x w
t cook cooked h f
t bake baked h f
t cut cut h of
t break broke x o
t open opened h o
t close closed h o
t build built h b
t make made h of
t catch caught x a
t throw threw h o
t wash washed h oh
t buy bought h ofw
t sell sold h ofw
t steal stole h ofw
t push pushed x o
t pull pulled x o
t forge forged h o
t weave wove h o
t sew sewed h o
t read read h o
t write wrote h o
t draw drew h o
t paint painted h o
t plant planted h v
t gather gathered h ofwv
t pour poured h w
t light lit h o
t burn burned x b
t love loved x x
t hate hated x x
t fear feared x xn
t help helped x h
t trust trusted x h
t chase chased x a
t attack attacked x x
t defend defended h hpb
t kill killed x a
t rescue rescued h x
t capture captured h a
t guard guarded x hpbo
t feed fed h a
t teach taught h h
t ask asked h h
t answer answered h h
t call called h h
t greet greeted h h
t invite invited h h
t welcome welcomed h h
t protect protected x x
t warn warned h h
t forgive forgave h h
t heal healed h h
t wound wounded x x
t marry married h h
t betray betrayed h h
t serve served h h
t obey obeyed h h
t command commanded h h
t reward rewarded h h
t honor honored h h
t share shared h of
t study studied h o
t milk milked h a
t herd herded h a
t shear sheared h a
t ride rode h a
t bury buried h x
t bless blessed h h
t hunt hunted x a
d give gave x ofw
d show showed h o
d send sent h o
d bring brought h ofw
d offer offered h ofw
c think thought xh -
c know knew xh -
c believe believed h -
c hope hoped h -
c say said h -
w want wanted xh -
w decide decided h -
w begin began h -
w start started h -
w need needed xh -
`;

export const VERBS = Object.freeze(VERB_TABLE.trim().split('\n').map(l => {
    const [kind, lemma, past, agent, patient] = l.trim().split(/\s+/);
    const goal = kind === 'm' ? patient : null;
    return Object.freeze({ kind, lemma, past, agent: expand(agent), patient: kind === 'm' || patient === '-' ? '' : expand(patient), goal });
}));
function expand(s) { return s === '-' ? '' : s.replace('x', 'ha'); }

// cast: lemma, classes, pronoun class, English noun (mass nouns take no article), activities (intransitive verbs of the trade)
const CAST_TABLE = `
hunter h male - hunt
farmer h male - farm
fisherman h male - fish
king h male - sit
queen h female - sit
child h neutral - laugh
woman h female - work
man h male - work
sailor h male - work
smith h male - work
merchant h male - travel
priest h male - pray
thief h male - hide
soldier h male - wait
shepherd h male - work
miller h male - work
baker h female - work
healer h female - work
stranger h neutral - wander
elder h male - sit
wolf a neutral - hunt
fox a neutral - hide
crow a neutral - fly
dog a neutral - sleep
bear a neutral - sleep
dragon a neutral - fly
horse a neutral - run
cow a neutral - rest
sheep a neutral - rest
goat a neutral - rest
bird a neutral - sing
snake a neutral - hide
cat a neutral - sleep
deer a neutral - run
eagle a neutral - fly
mouse a neutral - hide
lion a neutral - hunt
forest pd neutral -
village pd neutral -
river p neutral -
mountain pd neutral -
house pbd neutral -
field p neutral -
sea p neutral -
road p neutral -
bridge pb neutral -
town pd neutral -
castle pbd neutral -
cave pd neutral -
island pd neutral -
market p neutral -
garden p neutral -
hill pd neutral -
well pb neutral -
temple pb neutral -
tower pbd neutral -
knife o neutral -
sword o neutral -
key o neutral -
stone o neutral -
boat o neutral -
net o neutral -
rope o neutral -
coin o neutral -
book o neutral -
cup o neutral -
lamp o neutral -
cart o neutral -
basket o neutral -
bag o neutral -
axe o neutral -
spear o neutral -
bow o neutral -
ring o neutral -
bowl o neutral -
gold o neutral mass
cloth o neutral mass
bread f neutral mass
meat f neutral mass
cheese f neutral mass
fruit f neutral mass
egg f neutral -
water w neutral mass
milk w neutral mass
wine w neutral mass
tree v neutral -
flower v neutral -
storm n neutral -
wind n neutral -
`;
export const CAST = Object.freeze(CAST_TABLE.trim().split('\n').map(l => {
    const [lemma, classes, pron, mass, does] = l.trim().split(/\s+/);
    return Object.freeze({ lemma, classes, pron, mass: mass === 'mass', does: does && does !== '-' ? does : null });
}));

// adjectives that fit a class of the cast (states of beings, qualities of things and places)
export const ADJECTIVES = Object.freeze({
    h: ['hungry', 'tired', 'happy', 'afraid', 'old', 'young', 'wise', 'poor', 'rich', 'brave', 'kind', 'sick', 'angry', 'sad', 'strong', 'alone', 'thirsty', 'cruel'],
    a: ['hungry', 'strong', 'big', 'small', 'old', 'angry', 'fast', 'afraid', 'thirsty'],
    p: ['quiet', 'old', 'small', 'big', 'dark', 'cold', 'high'],
    o: ['sharp', 'heavy', 'old', 'new', 'small', 'big'],
    n: ['strong', 'cold', 'dark', 'big']
});
export const ENGLISH_ADJECTIVE = Object.freeze({});
