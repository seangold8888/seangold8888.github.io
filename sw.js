"use strict";

// Advance this generation whenever a shared shell or optional game's immutable assets change.
const CACHE_VERSION = "v145";
const CACHE_PREFIX = "adventure-box-";
// 큰 그림과 소리(삼국지 배경 200MB+, 저장한 이야기 오디오)는 배포 번호와 따로 둔다.
// 배포마다 이 캐시를 버리면 기기가 236MB를 다시 받고, "여행 전에 이야기 저장"도 지워졌다.
// 같은 이름의 그림·소리 파일을 새 내용으로 덮어썼을 때만 이 번호를 올린다.
const MEDIA_REVISION = "r1";
const STATIC_CACHE = `${CACHE_PREFIX}${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_PREFIX}media-${MEDIA_REVISION}`;
const AUDIO_CACHE = `${CACHE_PREFIX}audio-${MEDIA_REVISION}`;
// 예전 배포 번호가 붙은 미디어 캐시. 지우기 전에 새 캐시로 옮겨 담는다.
const LEGACY_MEDIA_CACHE = /^adventure-box-v\d+-(runtime|audio)$/;

// Resolve every relative asset against this worker's directory. On GitHub Pages
// that directory is the repository subpath, not the origin root.
const workerScriptUrl = typeof self === "undefined"
  ? new URL("http://localhost/sw.js")
  : new URL(self.location.href);
const SITE_ROOT_URL = new URL("./", workerScriptUrl);

const CORE_SHELL = [
  "./multiverse/",
  "./multiverse/index.html",
  "./multiverse/style.css?v=1",
  "./multiverse/data.js?v=1",
  "./multiverse/save.js?v=1",
  "./multiverse/game.js?v=1",
  "./multiverse/art/cover.webp",
  "./multiverse/art/jaei-idle.webp",
  "./multiverse/art/taeo-idle.webp",
  "./",
  "./index.html",
  // 허브(모험 상자)는 /game/ 에 있다. 뿌리 index.html 은 여기로 보내는 작은 페이지다.
  "./game/",
  "./game/index.html",
  "./assets/study/picnic-scene.jpg",
  "./assets/study/jaei.jpg",
  "./math/curriculum.js?v=20",
  "./math/learning.js?v=29",
  "./math/store.js?v=32",
  "./assets/study/math-bridge.js?v=2",
  "./assets/study/english-reading.js?v=21",
  "./assets/study/praise/excellent.mp3",
  "./assets/study/praise/perfect-v2.wav",
  "./assets/study/praise/awesome.mp3",
  "./assets/study/praise/wonderful.mp3",
  "./assets/study/praise/great.mp3",
  "./assets/study/praise/verygood.mp3",
  "./assets/study/praise/youdidit.mp3",
  "./assets/study/praise/super.mp3",
  "./assets/study/praise/threeinarow.mp3",
  "./assets/study/words/i.mp3",
  "./assets/study/words/like.mp3",
  "./assets/study/words/apples.mp3",
  "./assets/study/words/see.mp3",
  "./assets/study/words/a.mp3",
  "./assets/study/words/cat.mp3",
  "./assets/study/words/this.mp3",
  "./assets/study/words/is.mp3",
  "./assets/study/words/my.mp3",
  "./assets/study/words/book.mp3",
  "./assets/study/words/can.mp3",
  "./assets/study/words/run.mp3",
  "./assets/study/words/the.mp3",
  "./assets/study/words/sun.mp3",
  "./assets/study/words/bright.mp3",
  "./assets/study/words/milk.mp3",
  "./assets/study/words/family.mp3",
  "./assets/study/words/have.mp3",
  "./assets/study/words/dog.mp3",
  "./assets/study/words/bird.mp3",
  "./assets/study/words/fly.mp3",
  "./assets/study/words/am.mp3",
  "./assets/study/words/happy.mp3",
  "./assets/study/words/red.mp3",
  "./assets/study/words/flower.mp3",
  "./assets/study/words/we.mp3",
  "./assets/study/words/play.mp3",
  "./assets/study/words/together.mp3",
  "./assets/study/words/wash.mp3",
  "./assets/study/words/hands.mp3",
  "./assets/study/words/please.mp3",
  "./assets/study/words/open.mp3",
  "./assets/study/words/door.mp3",
  "./assets/study/words/thank.mp3",
  "./assets/study/words/you.mp3",
  "./assets/study/words/very.mp3",
  "./assets/study/words/much.mp3",
  "./assets/study/words/love.mp3",
  "./assets/study/words/big.mp3",
  "./assets/study/words/ball.mp3",
  "./assets/study/words/jump.mp3",
  "./assets/study/words/swim.mp3",
  "./assets/study/words/small.mp3",
  "./assets/study/words/bananas.mp3",
  "./assets/study/words/mom.mp3",
  "./assets/study/words/dad.mp3",
  "./assets/study/words/bag.mp3",
  "./assets/study/words/pen.mp3",
  "./assets/study/words/two.mp3",
  "./assets/study/words/cats.mp3",
  "./assets/study/words/three.mp3",
  "./assets/study/words/birds.mp3",
  "./assets/study/words/sky.mp3",
  "./assets/study/words/blue.mp3",
  "./assets/study/words/grass.mp3",
  "./assets/study/words/green.mp3",
  "./assets/study/words/apple.mp3",
  "./assets/study/words/moon.mp3",
  "./assets/study/words/round.mp3",
  "./assets/study/words/star.mp3",
  "./assets/study/words/good.mp3",
  "./assets/study/words/morning.mp3",
  "./assets/study/words/night.mp3",
  "./assets/study/words/girl.mp3",
  "./assets/study/words/are.mp3",
  "./assets/study/words/friend.mp3",
  "./assets/study/words/it.mp3",
  "./assets/study/words/fish.mp3",
  "./assets/study/words/sing.mp3",
  "./assets/study/words/song.mp3",
  "./assets/study/words/high.mp3",
  "./assets/study/words/go.mp3",
  "./assets/study/words/home.mp3",
  "./assets/study/words/to.mp3",
  "./assets/study/words/school.mp3",
  "./assets/study/words/bus.mp3",
  "./assets/study/words/yellow.mp3",
  "./assets/study/words/fast.mp3",
  "./assets/study/words/friends.mp3",
  "./assets/study/words/and.mp3",
  "./assets/study/words/me.mp3",
  "./assets/study/words/at.mp3",
  "./assets/study/words/little.mp3",
  "./assets/study/words/on.mp3",
  "./assets/study/words/bed.mp3",
  "./assets/study/words/in.mp3",
  "./assets/study/words/tree.mp3",
  "./assets/study/words/for.mp3",
  "./assets/study/words/want.mp3",
  "./assets/study/words/has.mp3",
  "./assets/study/words/before.mp3",
  "./assets/study/words/there.mp3",
  "./assets/study/words/likes.mp3",
  "./assets/study/words/with.mp3",
  "./assets/study/words/new.mp3",
  "./assets/study/words/well.mp3",
  "./assets/study/words/up.mp3",
  "./assets/study/words/every.mp3",
  "./assets/study/words/day.mp3",
  "./assets/study/words/look.mp3",
  "./assets/study/words/not.mp3",
  "./assets/study/words/fun.mp3",
  "./assets/study/words/read.mp3",
  "./assets/study/words/hungry.mp3",
  "./assets/study/words/your.mp3",
  "./assets/study/words/then.mp3",
  "./assets/study/words/now.mp3",
  "./assets/study/words/stars.mp3",
  "./assets/study/words/they.mp3",
  "./assets/study/words/pink.mp3",
  "./assets/study/words/hat.mp3",
  "./assets/study/words/eat.mp3",
  "./assets/study/words/an.mp3",
  "./assets/study/words/egg.mp3",
  "./assets/study/words/drink.mp3",
  "./assets/study/words/water.mp3",
  "./assets/study/words/ice.mp3",
  "./assets/study/words/cream.mp3",
  "./assets/study/words/rabbit.mp3",
  "./assets/study/words/white.mp3",
  "./assets/study/words/pig.mp3",
  "./assets/study/words/frog.mp3",
  "./assets/study/words/hot.mp3",
  "./assets/study/words/cold.mp3",
  "./assets/study/words/cup.mp3",
  "./assets/study/words/sit.mp3",
  "./assets/study/words/down.mp3",
  "./assets/study/words/come.mp3",
  "./assets/study/words/here.mp3",
  "./assets/study/words/seven.mp3",
  "./assets/study/words/birthday.mp3",
  "./assets/study/words/soon.mp3",
  "./assets/study/words/ride.mp3",
  "./assets/study/words/bike.mp3",
  "./assets/study/words/under.mp3",
  "./assets/study/words/table.mp3",
  "./assets/study/words/sister.mp3",
  "./assets/study/words/flowers.mp3",
  "./assets/study/words/bread.mp3",
  "./assets/study/words/runs.mp3",
  "./assets/study/words/draw.mp3",
  "./assets/study/words/reads.mp3",
  "./assets/study/words/baby.mp3",
  "./assets/study/words/sleeping.mp3",
  "./assets/study/words/put.mp3",
  "./assets/study/words/shoes.mp3",
  "./assets/study/words/outside.mp3",
  "./assets/study/words/sings.mp3",
  "./assets/study/words/brother.mp3",
  "./assets/study/words/park.mp3",
  "./assets/study/words/makes.mp3",
  "./assets/study/words/cake.mp3",
  "./assets/study/words/duck.mp3",
  "./assets/study/words/swims.mp3",
  "./assets/study/words/pond.mp3",
  "./assets/study/words/brush.mp3",
  "./assets/study/words/teeth.mp3",
  "./assets/study/words/many.mp3",
  "./assets/study/words/bear.mp3",
  "./assets/study/words/honey.mp3",
  "./assets/study/words/help.mp3",
  "./assets/study/words/dishes.mp3",
  "./assets/study/words/children.mp3",
  "./assets/study/words/playing.mp3",
  "./assets/study/words/grandma.mp3",
  "./assets/study/words/gives.mp3",
  "./assets/study/words/warm.mp3",
  "./assets/study/words/hug.mp3",
  "./assets/study/words/long.mp3",
  "./assets/study/words/ears.mp3",
  "./assets/study/words/sleep.mp3",
  "./assets/study/words/beach.mp3",
  "./assets/study/words/summer.mp3",
  "./assets/study/words/sits.mp3",
  "./assets/study/words/leaf.mp3",
  "./assets/study/words/build.mp3",
  "./assets/study/words/sandcastle.mp3",
  "./assets/study/words/rain.mp3",
  "./assets/study/words/falling.mp3",
  "./assets/study/words/umbrella.mp3",
  "./assets/study/words/share.mp3",
  "./assets/study/words/toys.mp3",
  "./assets/study/words/monkey.mp3",
  "./assets/study/words/climbs.mp3",
  "./assets/study/words/tall.mp3",
  "./assets/study/words/lunch.mp3",
  "./assets/study/words/today.mp3",
  "./assets/study/words/raining.mp3",
  "./assets/study/words/wants.mp3",
  "./assets/study/words/food.mp3",
  "./assets/study/words/he.mp3",
  "./assets/study/words/five.mp3",
  "./assets/study/words/lost.mp3",
  "./assets/study/words/where.mp3",
  "./assets/study/words/pretty.mp3",
  "./assets/study/words/smells.mp3",
  "./assets/study/words/cooking.mp3",
  "./assets/study/words/dinner.mp3",
  "./assets/study/words/yummy.mp3",
  "./assets/study/words/dirty.mp3",
  "./assets/study/words/them.mp3",
  "./assets/study/words/what.mp3",
  "./assets/study/words/do.mp3",
  "./assets/study/words/yes.mp3",
  "./assets/study/words/how.mp3",
  "./assets/study/words/old.mp3",
  "./assets/study/words/color.mp3",
  "./assets/study/words/no.mp3",
  "./assets/study/words/kitchen.mp3",
  "./assets/study/words/pencil.mp3",
  "./assets/study/words/some.mp3",
  "./assets/study/words/who.mp3",
  "./assets/study/words/she.mp3",
  "./assets/study/words/teacher.mp3",
  "./assets/study/words/going.mp3",
  "./assets/study/words/rainbow.mp3",
  "./assets/study/words/dogs.mp3",
  "./assets/study/words/fine.mp3",
  "./assets/study/words/one.mp3",
  "./assets/study/words/box.mp3",
  "./assets/study/words/toy.mp3",
  "./assets/study/words/car.mp3",
  "./assets/study/words/eating.mp3",
  "./assets/study/words/banana.mp3",
  "./assets/study/words/tired.mp3",
  "./assets/study/words/favorite.mp3",
  "./assets/study/words/played.mp3",
  "./assets/study/words/yesterday.mp3",
  "./assets/study/words/went.mp3",
  "./assets/study/words/zoo.mp3",
  "./assets/study/words/last.mp3",
  "./assets/study/words/sunday.mp3",
  "./assets/study/words/saw.mp3",
  "./assets/study/words/lion.mp3",
  "./assets/study/words/made.mp3",
  "./assets/study/words/pancakes.mp3",
  "./assets/study/words/drank.mp3",
  "./assets/study/words/glass.mp3",
  "./assets/study/words/of.mp3",
  "./assets/study/words/washed.mp3",
  "./assets/study/words/ate.mp3",
  "./assets/study/words/pizza.mp3",
  "./assets/study/words/was.mp3",
  "./assets/study/words/jumped.mp3",
  "./assets/study/words/rained.mp3",
  "./assets/study/words/all.mp3",
  "./assets/study/words/found.mp3",
  "./assets/study/words/shell.mp3",
  "./assets/study/words/cried.mp3",
  "./assets/study/words/because.mp3",
  "./assets/study/words/fell.mp3",
  "./assets/study/words/sang.mp3",
  "./assets/study/words/cleaned.mp3",
  "./assets/study/words/room.mp3",
  "./assets/study/words/flew.mp3",
  "./assets/study/words/over.mp3",
  "./assets/study/words/house.mp3",
  "./assets/study/words/gave.mp3",
  "./assets/study/words/finished.mp3",
  "./assets/study/words/homework.mp3",
  "./assets/study/words/walked.mp3",
  "./assets/study/words/laughed.mp3",
  "./assets/study/words/funny.mp3",
  "./assets/study/words/cooked.mp3",
  "./assets/study/words/noodles.mp3",
  "./assets/study/words/soccer.mp3",
  "./assets/study/words/after.mp3",
  "./assets/study/words/drew.mp3",
  "./assets/study/words/picture.mp3",
  "./assets/study/words/snowman.mp3",
  "./assets/study/words/melted.mp3",
  "./assets/study/words/came.mp3",
  "./assets/study/words/helped.mp3",
  "./assets/study/words/carry.mp3",
  "./assets/study/words/bags.mp3",
  "./assets/study/words/watched.mp3",
  "./assets/study/words/movie.mp3",
  "./assets/study/words/saturday.mp3",
  "./assets/study/words/into.mp3",
  "./assets/study/words/got.mp3",
  "./assets/study/words/from.mp3",
  "./assets/study/words/had.mp3",
  "./assets/study/words/picnic.mp3",
  "./assets/study/words/cannot.mp3",
  "./assets/study/words/helps.mp3",
  "./assets/study/words/his.mp3",
  "./assets/study/words/name.mp3",
  "./assets/study/words/max.mp3",
  "./assets/study/words/snowing.mp3",
  "./assets/study/words/make.mp3",
  "./assets/study/words/bakes.mp3",
  "./assets/study/words/cookies.mp3",
  "./assets/study/words/smell.mp3",
  "./assets/study/words/so.mp3",
  "./assets/study/words/goes.mp3",
  "./assets/study/words/orange.mp3",
  "./assets/study/words/time.mp3",
  "./assets/study/words/plant.mp3",
  "./assets/study/words/seed.mp3",
  "./assets/study/words/give.mp3",
  "./assets/study/words/grows.mp3",
  "./assets/study/words/sad.mp3",
  "./assets/study/words/him.mp3",
  "./assets/study/words/find.mp3",
  "./assets/study/words/wake.mp3",
  "./assets/study/words/early.mp3",
  "./assets/study/words/breakfast.mp3",
  "./assets/study/words/turtle.mp3",
  "./assets/study/words/walks.mp3",
  "./assets/study/words/slowly.mp3",
  "./assets/study/words/but.mp3",
  "./assets/study/words/wins.mp3",
  "./assets/study/words/party.mp3",
  "./assets/study/words/finds.mp3",
  "./assets/study/words/brings.mp3",
  "./assets/study/words/throw.mp3",
  "./assets/study/words/again.mp3",
  "./assets/study/words/library.mp3",
  "./assets/study/words/about.mp3",
  "./assets/study/words/dinosaurs.mp3",
  "./assets/study/words/wind.mp3",
  "./assets/study/words/strong.mp3",
  "./assets/study/words/kite.mp3",
  "./assets/study/words/flies.mp3",
  "./assets/study/words/hold.mp3",
  "./assets/study/words/string.mp3",
  "./assets/study/words/tight.mp3",
  "./assets/study/words/fall.mp3",
  "./assets/study/words/knee.mp3",
  "./assets/study/words/hurts.mp3",
  "./assets/study/words/comes.mp3",
  "./assets/study/words/near.mp3",
  "./assets/study/words/eats.mp3",
  "./assets/study/words/grandpa.mp3",
  "./assets/study/words/garden.mp3",
  "./assets/study/words/tomatoes.mp3",
  "./assets/study/words/pick.mp3",
  "./assets/study/words/tonight.mp3",
  "./assets/study/words/wish.mp3",
  "./assets/study/words/too.mp3",
  "./assets/study/words/feet.mp3",
  "./assets/study/words/grown.mp3",
  "./assets/study/words/buy.mp3",
  "./assets/study/words/late.mp3",
  "./assets/study/words/wait.mp3",
  "./assets/study/words/stop.mp3",
  "./assets/study/words/paint.mp3",
  "./assets/study/words/use.mp3",
  "./assets/study/words/sea.mp3",
  "./assets/study/words/crying.mp3",
  "./assets/study/words/her.mp3",
  "./assets/study/words/camping.mp3",
  "./assets/study/words/tent.mp3",
  "./assets/study/words/sees.mp3",
  "./assets/study/words/happily.mp3",
  "./assets/study/words/next.mp3",
  "./assets/study/words/wear.mp3",
  "./assets/study/words/coat.mp3",
  "./assets/study/words/tank.mp3",
  "./assets/study/words/feed.mp3",
  "./assets/study/words/story.mp3",
  "./assets/study/words/dragon.mp3",
  "./assets/study/words/asleep.mp3",
  "./assets/study/words/leaves.mp3",
  "./assets/study/words/built.mp3",
  "./assets/study/words/brick.mp3",
  "./assets/study/words/wolf.mp3",
  "./assets/study/words/blew.mp3",
  "./assets/study/words/hard.mp3",
  "./assets/study/words/did.mp3",
  "./assets/study/words/wore.mp3",
  "./assets/study/words/hood.mp3",
  "./assets/study/words/met.mp3",
  "./assets/study/words/nice.mp3",
  "./assets/study/words/hare.mp3",
  "./assets/study/words/tortoise.mp3",
  "./assets/study/words/slow.mp3",
  "./assets/study/words/took.mp3",
  "./assets/study/words/nap.mp3",
  "./assets/study/words/won.mp3",
  "./assets/study/words/race.mp3",
  "./assets/study/words/jack.mp3",
  "./assets/study/words/cow.mp3",
  "./assets/study/words/sold.mp3",
  "./assets/study/words/magic.mp3",
  "./assets/study/words/beans.mp3",
  "./assets/study/words/grew.mp3",
  "./assets/study/words/climbed.mp3",
  "./assets/study/words/plays.mp3",
  "./assets/study/words/sand.mp3",
  "./assets/study/words/grow.mp3",
  "./assets/study/words/carrots.mp3",
  "./assets/study/words/carrot.mp3",
  "./assets/study/words/rainy.mp3",
  "./assets/study/words/stay.mp3",
  "./assets/study/words/inside.mp3",
  "./assets/study/words/fort.mp3",
  "./assets/study/words/blankets.mp3",
  "./assets/study/words/books.mp3",
  "./assets/study/words/our.mp3",
  "./assets/study/words/tooth.mp3",
  "./assets/study/words/loose.mp3",
  "./assets/study/words/wiggles.mp3",
  "./assets/study/words/falls.mp3",
  "./assets/study/words/out.mp3",
  "./assets/study/words/pillow.mp3",
  "./assets/study/words/babies.mp3",
  "./assets/study/words/walk.mp3",
  "./assets/study/words/line.mp3",
  "./assets/study/words/their.mp3",
  "./assets/study/words/be.mp3",
  "./assets/study/words/doctor.mp3",
  "./assets/study/words/will.mp3",
  "./assets/study/words/sick.mp3",
  "./assets/study/words/people.mp3",
  "./assets/study/words/kind.mp3",
  "./assets/study/words/feel.mp3",
  "./assets/study/words/better.mp3",
  "./assets/study/words/card.mp3",
  "./assets/study/words/heart.mp3",
  "./assets/study/words/wrote.mp3",
  "./assets/study/words/smiled.mp3",
  "./assets/study/words/hugged.mp3",
  "./assets/study/words/us.mp3",
  "./assets/study/words/mouse.mp3",
  "./assets/study/words/net.mp3",
  "./assets/study/words/cut.mp3",
  "./assets/study/words/boy.mp3",
  "./assets/study/words/wished.mp3",
  "./assets/study/words/puppy.mp3",
  "./assets/study/words/snow.mp3",
  "./assets/study/words/world.mp3",
  "./assets/study/words/boots.mp3",
  "./assets/study/words/woke.mp3",
  "./assets/study/words/spring.mp3",
  "./assets/study/words/looked.mp3",
  "./assets/study/words/full.mp3",
  "./assets/study/words/bees.mp3",
  "./assets/study/words/by.mp3",
  "./assets/study/words/talk.mp3",
  "./assets/study/words/laugh.mp3",
  "./assets/study/words/princess.mp3",
  "./assets/study/words/shoe.mp3",
  "./assets/study/words/prince.mp3",
  "./assets/study/words/everywhere.mp3",
  "./assets/study/words/fit.mp3",
  "./assets/study/words/foot.mp3",
  "./assets/study/words/planted.mp3",
  "./assets/study/words/watered.mp3",
  "./assets/study/words/sprout.mp3",
  "./assets/study/words/sunflower.mp3",
  "./assets/study/words/bath.mp3",
  "./assets/study/words/shook.mp3",
  "./assets/study/words/off.mp3",
  "./assets/study/words/wet.mp3",
  "./assets/study/words/dark.mp3",
  "./assets/study/words/heard.mp3",
  "./assets/study/words/noise.mp3",
  "./assets/study/words/scared.mp3",
  "./assets/study/words/only.mp3",
  "./assets/study/words/class.mp3",
  "./assets/study/words/trip.mp3",
  "./assets/study/words/sharks.mp3",
  "./assets/study/words/shark.mp3",
  "./assets/study/words/liked.mp3",
  "./assets/study/words/turtles.mp3",
  "./assets/study/words/best.mp3",
  "./assets/study/words/visit.mp3",
  "./assets/study/words/brought.mp3",
  "./assets/study/words/teddy.mp3",
  "./assets/study/words/named.mp3",
  "./assets/study/words/robot.mp3",
  "./assets/study/words/clean.mp3",
  "./assets/study/words/games.mp3",
  "./assets/study/words/caterpillar.mp3",
  "./assets/study/words/cocoon.mp3",
  "./assets/study/words/slept.mp3",
  "./assets/study/words/days.mp3",
  "./assets/study/words/became.mp3",
  "./assets/study/words/butterfly.mp3",
  "./assets/study/words/baked.mp3",
  "./assets/study/words/mixed.mp3",
  "./assets/study/words/flour.mp3",
  "./assets/study/words/waited.mp3",
  "./assets/study/words/smelled.mp3",
  "./assets/study/words/away.mp3",
  "./assets/study/words/ran.mp3",
  "./assets/study/words/man.mp3",
  "./assets/study/words/caught.mp3",
  "./assets/study/words/said.mp3",
  "./assets/study/words/learned.mp3",
  "./assets/study/words/first.mp3",
  "./assets/study/words/held.mp3",
  "./assets/study/words/seat.mp3",
  "./assets/study/words/myself.mp3",
  "./assets/study/words/looks.mp3",
  "./assets/study/words/cookie.mp3",
  "./assets/study/words/laughs.mp3",
  "./assets/study/words/lonely.mp3",
  "./assets/study/words/shone.mp3",
  "./assets/study/words/ant.mp3",
  "./assets/study/words/worked.mp3",
  "./assets/study/words/grasshopper.mp3",
  "./assets/study/words/winter.mp3",
  "./assets/study/taeo.jpg",
  "./assets/study/mom.jpg",
  "./assets/study/dad.jpg",
  "./manifest.json",
  "./icon.png",
  "./icon-192.png",
  "./og-adventure-v3.png",
  "./icon-512.png",
  "./story/",
  "./story/index.html",
  "./story/english/",
  "./story/english/index.html",
  "./story/english/books.js?v=2",
  "./cards/",
  "./cards/index.html",
  "./cards/styles.css?v=66",
  "./math/assets/jaei-family-v4.webp",
  "./cards/campaign.css?v=66",
  "./cards/cards.json",
  "./assets/bgm/bgm-player.js?v=66",
  "./assets/study/play-timer.js?v=1",
  "./cards/js/engine.js?v=66",
  "./cards/js/audio.js?v=66",
  "./cards/js/card-view.js?v=66",
  "./cards/js/vfx-recipes.js?v=66",
  "./cards/js/story-gates.js?v=66",
  "./cards/js/campaign.js?v=66",
  "./cards/js/campaign-ui.js?v=66",
  "./cards/js/app.js?v=66",
  "./cards/js/combat-cinema.js?v=66",
];

// Existing games are precached as best-effort shells. A missing optional asset
// must never prevent the hub, stories, cards and 40 card images from installing.
const PRINCESS_STUDIO_ASSETS = Object.entries({
  dress: "ballgown aline party mermaidline hanbok tutu tail winter star rainbow summer rose adventure",
  hair: "bob bun braid wavy pigtails daenggi curls afro",
  shoes: "pumps glass boots sneakers sandals ballet rain slippers kkotsin",
  crown: "crown tiara flowers bow starclip pearls witch bunny catears hennin daenggi moon veil",
  neck: "pearls heart gem scarf choker star norigae flowerlei",
  hand: "wand fan bouquet umbrella bag balloon book lollipop sword mirror basket",
  back: "fairy butterfly cape angel bat backpack",
  pet: "cat dog rabbit bird frog unicorn deer butterfly dragon hamster mouse fish toad",
  bg: "plain castle forest sea night cherry ballroom snow rainbow candy tower meadow hanok rosecastle",
}).flatMap(([category, ids]) => ids.split(" ").map(id =>
  `./princess/assets/studio-v3/${category}-${id}.${category === "bg" ? "jpg" : "webp"}`
));
const OPTIONAL_SHELL = [
  "./multiverse/art/bg-city.webp",
  "./multiverse/art/bg-core.webp",
  "./multiverse/art/bg-sky.webp",
  "./multiverse/art/bg-web.webp",
  "./multiverse/art/boss-golem.webp",
  "./multiverse/art/boss-jaewing.webp",
  "./multiverse/art/boss-mecha.webp",
  "./multiverse/art/boss-spider.webp",
  "./multiverse/art/enemy-drone.webp",
  "./multiverse/art/enemy-shield.webp",
  "./multiverse/art/enemy-tin.webp",
  "./multiverse/art/jaei-attack.webp",
  "./multiverse/art/jaei-hurt.webp",
  "./multiverse/art/jaei-run.webp",
  "./multiverse/art/jaei-special.webp",
  "./multiverse/art/taeo-attack.webp",
  "./multiverse/art/taeo-hurt.webp",
  "./multiverse/art/taeo-run.webp",
  "./multiverse/art/taeo-special.webp",
  "./math/party/",
  "./math/party/party.css?v=2",
  "./math/party/extra.css?v=1",
  "./math/party/dance.css?v=1",
  "./math/party/dance.js?v=3",
  "./math/party/family-rear-dance-v1.png",
  "./math/party/engine.js?v=1",
  "./math/party/music.js?v=1",
  "./math/party/extra.js?v=2",
  "./math/party/party.js?v=5",
  "./math/party/parity.js?v=1",
  "./princess/cover-natural-v50.png",
  "./assets/study/princess-growth.js?v=2",
  "./assets/study/princess-growth.css?v=1",
  "./princess/journey.js?v=2",
  "./princess/journey.css?v=1",
  "./avengers/",
  "./avengers/sw.js",
  "./avengers/manifest.webmanifest",
  "./avengers/assets/index-D_Krq1Fc.js",
  "./avengers/assets/index-uRBZKIPW.css",
  "./avengers/icons/apple-touch-icon-180.png",
  "./avengers/icons/multiverse-icon-192.png",
  "./avengers/icons/multiverse-icon-512.png",
  "./avengers/icons/multiverse-icon.svg",
  "./bori/",
  "./hogwarts/",
  "./hogwarts/icon.png",
  "./kart/",
  "./kart/src/music.js",
  "./kart/src/mode7.js",
  "./kart/src/track.js",
  "./kart/src/track-art.js",
  "./kart/src/sprites.js",
  "./kart/src/kart.js",
  "./kart/src/main.js",
  "./kart3d/",
  "./kart3d/src/game.js",
  "./kart3d/src/items.js",
  "./kart3d/src/karts.js",
  "./kart3d/src/music.js",
  "./kart3d/src/trackmesh.js",
  "./kart3d/src/tracks.js",
  "./kart3d/src/props.js",
  "./kart3d/vendor/GLTFLoader.js",
  "./kart3d/vendor/BufferGeometryUtils.js",
  "./kart3d/assets/props.glb",
  "./assets/covers/cover_kart3d.webp",
  "./assets/covers/cover_kart.webp",
  "./assets/covers/cover_gem.webp",
  "./assets/covers/cover_stage.webp",
  "./cards/art/bg/arena-castle.webp",
  "./cards/art/bg/arena-forest.webp",
  "./kart3d/vendor/three.module.min.js",
  "./kedehun/",
  "./kedehun/attack-motion.js?v=1",
  "./kedehun/combat-v2.js?v=2",
  "./kedehun/combat-v2.css?v=1",
  "./kedehun/art/enemies/demon-roster-v1.png",
  "./kedehun/art/enemies/seoul-rooftop-v1.png",
  "./kedehun/art/characters/lumi-attacks-v1.png?v=1",
  "./kedehun/art/characters/mira-attacks-v1.png?v=1",
  "./kedehun/art/characters/joy-attacks-v1.png?v=1",
  "./kedehun/art/characters/lumi-v2.webp?v=28",
  "./kedehun/art/characters/mira-v2.webp?v=28",
  "./kedehun/art/characters/joy-v2.webp?v=28",
  "./odyssey/",
  "./princess/",
  "./princess/cover.svg",
  "./princess/cover.jpg?v=31",
  "./princess/studio.js?v=49",
  "./princess/icons.js?v=1",
  "./princess/wardrobe.js?v=4",
  "./princess/footwear.js?v=1",
  ..."pumps glass boots sneakers sandals ballet rain slippers kkotsin".split(" ").map(id => `./princess/assets/footwear-v49/${id}.webp`),
  "./princess/salon.js?v=1",
  ..."snow cinder rapunzel thumb kongjwi briar moon frost sahara lotus sunny".split(" ").flatMap(id => ["half","braid"].map(style => `./princess/assets/salon-v47/${id}-${style}.webp`)),
  ..."ballgown aline party mermaidline hanbok tutu winter star rainbow summer rose adventure".split(" ").map(id => `./princess/assets/wardrobe-v45/${id}.webp`),
  "./princess/outings.js?v=1",
  "./princess/outings.css?v=1",
  ..."frost sahara lotus sunny".split(" ").flatMap(id => ["body","grip"].map(part => `./princess/assets/characters-v36/${part}-${id}.webp`)),
  "./princess/assets/hair-v35/hair-bob.webp",
  ..."half braid tail-body".split(" ").map(id => `./princess/assets/salon-v44/mermaid-${id}.webp`),
  ..."snow cinder rapunzel mermaid thumb kongjwi briar moon frost sahara lotus sunny".split(" ").map(id => `./princess/assets/heads-v43/${id}.webp`),
  ..."snow cinder rapunzel mermaid thumb kongjwi briar moon".split(" ").map(id => `./princess/assets/wear-v5/grip-${id}.webp`),
  ...PRINCESS_STUDIO_ASSETS,
  ..."snow cinder rapunzel mermaid thumb kongjwi briar moon".split(" ").map(id => `./princess/assets/bodies-v4/body-${id}.webp`),
  "./sanguo/",
  "./sanguo/index.html",
  "./sanguo/menu-v4.css",
  "./sanguo/game-controls.css",
  "./sanguo/mobile-hud.css",
  "./sanguo/src/main.js",
  "./sanguo/src/data.js",
  "./sanguo/src/data/sanguoRoster.js",
  "./sanguo/src/data/works.js",
  "./sanguo/src/game/sideScroller.js",
  "./sanguo/src/game/hud.js",
  "./sanguo/src/game/dashSkills.js",
  "./sanguo/src/game/battleCries.js",
  "./sanguo/src/game/heroRenderScale.js",
  "./sanguo/src/game/combatBounds.js",
  "./sanguo/src/game/mountedSprites.js",
  "./sanguo/art/side-scroller/zhaoyun-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/caocao-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/machao-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mount-zhaoyun-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mount-caocao-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mount-machao-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/rider-guanyu-combat-bow-v1.png",
  "./sanguo/art/side-scroller/rider-zhaoyun-combat-bow-v1.png",
  "./sanguo/art/side-scroller/rider-caocao-combat-bow-v1.png",
  "./sanguo/art/side-scroller/rider-machao-combat-bow-v1.png",
  "./sanguo/src/game/scenery.js",
  "./sanguo/src/game/tint.js",
  "./sanguo/src/game/difficulty.js",
  "./sanguo/src/game/progression.js",
  "./sanguo/src/ui/result.js",
  "./sanguo/src/ui/title.js",
  "./sanguo/src/ui/storyIntro.js",
  "./sanguo/src/ui/workSelect.js",
  "./sanguo/assets/index-DnM9zJtq.js",
  "./sanguo/assets/index-BFRqmzM-.css",
  "./sanguo/mobile-hud.css",
  "./sanguo/data/gamedata.json",
  "./sanguo/fonts/pretendard/PretendardVariable.woff2",
  "./sanguo/fonts/gowun/GowunBatang-Regular.woff2",
  "./sanguo/fonts/gowun/GowunBatang-Bold.woff2",
];
const APP_SHELL = [...CORE_SHELL, ...OPTIONAL_SHELL];

// Filled from the checked-in files. These large assets never participate in
// install or activation; they warm in the background with bounded concurrency.
const SANGUO_RUNTIME_ASSETS = [
  "./sanguo/art/battlefield/baihuling-far-v1.png",
  "./sanguo/art/battlefield/baihuling-ground-v1.png",
  "./sanguo/art/battlefield/baihuling-mid-v1.png",
  "./sanguo/art/battlefield/donghai-far-v1.png",
  "./sanguo/art/battlefield/donghai-ground-v1.png",
  "./sanguo/art/battlefield/donghai-mid-v1.png",
  "./sanguo/art/battlefield/flamemountain-far-v1.png",
  "./sanguo/art/battlefield/flamemountain-ground-v1.png",
  "./sanguo/art/battlefield/flamemountain-mid-v1.png",
  "./sanguo/art/battlefield/heavenpalace-far-v1.png",
  "./sanguo/art/battlefield/heavenpalace-ground-v1.png",
  "./sanguo/art/battlefield/heavenpalace-mid-v1.png",
  "./sanguo/art/battlefield/huaguoshan-far-v1.png",
  "./sanguo/art/battlefield/huaguoshan-ground-v1.png",
  "./sanguo/art/battlefield/huaguoshan-mid-v1.png",
  "./sanguo/art/battlefield/huoyundong-far-v1.png",
  "./sanguo/art/battlefield/huoyundong-ground-v1.png",
  "./sanguo/art/battlefield/huoyundong-mid-v1.png",
  "./sanguo/art/battlefield/lianhuadong-far-v1.png",
  "./sanguo/art/battlefield/lianhuadong-ground-v1.png",
  "./sanguo/art/battlefield/lianhuadong-mid-v1.png",
  "./sanguo/art/battlefield/shituoling-far-v1.png",
  "./sanguo/art/battlefield/shituoling-ground-v1.png",
  "./sanguo/art/battlefield/shituoling-mid-v1.png",
  "./sanguo/art/side-scroller/bajie-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/bajie-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-caimao-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-caochun-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-chunyuqiong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-erlangshen-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-gaoqiu-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-huaxiong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-luqian-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-luxun-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-simayi-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-wumawang-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-hunshimowang-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-aoguang-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-baigujing-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/nezha-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/nezha-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/erlangshen-hero-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/erlangshen-hero-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-yinjiao-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-honghaier-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-dapeng-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/honghaier-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/honghaier-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mount-fenghuolun-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-nezha-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-nezha-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-xiahoudun-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-zhangjiao-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/caocao-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/ganning-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/ganning-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/enemy-action-sheet-v2.png",
  "./sanguo/art/side-scroller/enemy-painted-sheet-v4.png",
  "./sanguo/art/side-scroller/enemy-pixel-sheet-v3.png",
  "./sanguo/art/side-scroller/guanyu-action-sheet-v2.png",
  "./sanguo/art/side-scroller/guanyu-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/guanyu-painted-sheet-v4.png",
  "./sanguo/art/side-scroller/guanyu-pixel-sheet-v3.png",
  "./sanguo/art/side-scroller/huanggai-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/huanggai-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/hulao-arcade-bg-v3.png",
  "./sanguo/art/side-scroller/hulao-boss-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/husanniang-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/item-pickups-painted-atlas-v1.png",
  "./sanguo/art/side-scroller/jindouyun-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/linchong-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/linchong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/liubei-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/liubei-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/luxun-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/lizhishen-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/lizhishen-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mount-bajie-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mount-guanyu-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mount-linchong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mount-liubei-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mount-lizhishen-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mount-wujing-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mount-wusong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mount-zhangfei-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-bajie-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-bajie-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-guanyu-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-guanyu-painted-sheet-v2.png",
  "./sanguo/art/side-scroller/mounted-guanyu-pixel-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-linchong-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-linchong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-liubei-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-liubei-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-lizhishen-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-lizhishen-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-wujing-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-wujing-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-wukong-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-wukong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-wusong-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-wusong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-zhangfei-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-zhangfei-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/red-hare-painted-sheet-v2.png",
  "./sanguo/art/side-scroller/red-hare-painted-sheet-v3.png",
  "./sanguo/art/side-scroller/red-hare-pixel-sheet-v1.png",
  "./sanguo/art/side-scroller/reward-chest-painted-v1.png",
  "./sanguo/art/side-scroller/simayi-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/simayi-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/sunshangxiang-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/sunquan-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/sunquan-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/taishici-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/taishici-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/tieshangongzhu-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/tieshangongzhu-painted-sheet-v2.png",
  "./sanguo/art/side-scroller/wujing-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/wujing-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/wukong-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/wukong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/wusong-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/wusong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/xiahoudun-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/xiahoudun-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/xuchu-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/xuchu-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/zhangfei-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/zhangfei-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/zhangliao-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/zhangliao-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/zhaoyun-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/machao-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/huangzhong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/huangzhong-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/zhouyu-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/zhouyu-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/zhugeliang-painted-sheet-v1.png",
  "./sanguo/audio/battle-cries/female-warrior-cheers-cc0.mp3",
  "./sanguo/audio/battle-cries/male-agile-a-cc0.wav",
  "./sanguo/audio/battle-cries/male-agile-b-cc0.wav",
  "./sanguo/audio/battle-cries/male-fierce-a-cc0.wav",
  "./sanguo/audio/battle-cries/male-fierce-b-cc0.wav",
  "./sanguo/audio/battle-cries/male-heavy-a-cc0.wav",
  "./sanguo/audio/battle-cries/male-heavy-b-cc0.wav",
  "./sanguo/audio/battle-cries/male-noble-a-cc0.wav",
  "./sanguo/audio/battle-cries/male-noble-b-cc0.wav",
  "./sanguo/audio/cinematic-breath/battle-inhale-deep-cc0-v1.ogg",
  "./sanguo/audio/cinematic-breath/battle-inhale-neutral-cc0-v1.ogg",
  "./sanguo/audio/cinematic-water/water-splash-heavy-01-cc0-v1.ogg",
  "./sanguo/audio/cinematic-water/water-splash-heavy-02-cc0-v1.ogg",
  "./sanguo/audio/cinematic-water/water-splash-heavy-03-cc0-v1.ogg",
  "./sanguo/audio/cinematic-water/water-splash-light-01-cc0-v1.ogg",
  "./sanguo/audio/cinematic-water/water-splash-light-02-cc0-v1.ogg",
  "./sanguo/audio/cinematic-water/water-splash-light-03-cc0-v1.ogg",
  "./sanguo/audio/hero-callouts-ko-v6/bajie-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/huangzhong-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/huangzhong-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/machao-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/machao-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/bajie-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/caocao-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/caocao-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/guanyu-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/guanyu-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/huanggai-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/huanggai-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/husanniang-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/husanniang-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/linchong-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/linchong-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/liubei-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/liubei-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/lizhishen-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/lizhishen-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/sunshangxiang-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/sunshangxiang-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/tieshangongzhu-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/tieshangongzhu-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/wujing-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/wujing-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/wukong-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/wukong-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/wusong-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/wusong-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/zhangfei-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/zhangfei-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/zhaoyun-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/zhaoyun-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/zhouyu-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/zhouyu-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/zhugeliang-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/zhugeliang-special-v6.wav",
  "./sanguo/audio/kenney-impact/footstep_concrete_000.ogg",
  "./sanguo/audio/kenney-impact/footstep_concrete_001.ogg",
  "./sanguo/audio/kenney-impact/footstep_concrete_002.ogg",
  "./sanguo/audio/kenney-impact/footstep_concrete_003.ogg",
  "./sanguo/audio/kenney-impact/impactMetal_heavy_000.ogg",
  "./sanguo/audio/kenney-impact/impactMetal_heavy_001.ogg",
  "./sanguo/audio/kenney-impact/impactMetal_heavy_002.ogg",
  "./sanguo/audio/kenney-impact/impactMetal_light_000.ogg",
  "./sanguo/audio/kenney-impact/impactMetal_light_001.ogg",
  "./sanguo/audio/kenney-impact/impactMetal_light_002.ogg",
  "./sanguo/audio/mount-sfx/boar-grunt-ccby-v1.ogg",
  "./sanguo/audio/mount-sfx/horse-neigh-pd-v1.ogg",
  "./sanguo/audio/the_final_battle.ogg",
];
const BACKGROUND_ASSETS = [...OPTIONAL_SHELL, ...SANGUO_RUNTIME_ASSETS];
const BACKGROUND_WARM_CONCURRENCY = 2;
const BACKGROUND_RETRY_MS = 5 * 60 * 1000;
const AUDIO_FETCH_TIMEOUT_MS = 45000;
const NAVIGATION_ROUTES = [
  "game", "cards", "story", "multiverse", "avengers", "bori", "hogwarts", "kart", "kart3d",
  "kedehun", "odyssey", "princess", "sanguo",
];

const CARD_ART_FILES = [
  "arthur", "beanstalkgiant", "bremen", "cinderella", "fairygodmother", "genie",
  "heracles", "honggildong", "jack", "medusa", "mermaid", "midas", "odysseus",
  "perseus", "pinocchio", "polyphemus", "redhood", "snowqueen", "sunwukong",
  "threepigs", "tiger", "tortoisehare", "witch", "wolf", "zeus", "poseidon", "hades", "apollo",
  "minotaur", "cerberus", "hydra", "sphinx",
  "achilles", "theseus", "artemis", "atalanta",
  "athena", "hermes", "orpheus", "prometheus",
  "guanyu", "zhangfei", "zhaoyun", "zhugeliang", "caocao", "simayi",
  "nezha", "erlangshen", "wumawang", "honghaier", "baigujing",
  "jaei", "taeo", "appa", "eomma",
  "yisunshin", "euljimundeok", "ganggamchan", "kwonyul",
  "sherlockholmes", "doctorwatson", "arsenelupin", "moriarty",
  "gearwing", "starshield", "thunderguard", "redknot",
  "walllizard", "neonjumper", "moonmoth", "ppungdetective",
  "circe", "siren", "scylla", "helios",
  "sseugumi", "jaewing",
  "sejong", "jangyeongsil", "heojun", "shinsaimdang",
  "jeongyakyong", "kimhongdo", "yugwansun", "kimgu",
].map((id) => `./cards/art/${id}.webp`);

const VFX_ART_FILES = [
  "frost-needle",
  "gold-blade",
  "monster-impact",
  "stone-arc",
].map((id) => `./cards/art/vfx/${id}.webp`);

const AUDIO_FILES = [
  ["cinderella", "신데렐라"],
  ["odyssey_cyclops", "오디세이 1화"],
  ["jack_story", "잭과 콩나무"],
  ["redhood_story", "빨간 모자"],
  ["threepigs", "아기돼지 삼형제"],
  ["tortoisehare", "토끼와 거북"],
  ["pinocchio", "피노키오"],
  ["witch", "헨젤과 그레텔"],
  ["bremen", "브레멘 음악대"],
  ["snowqueen", "눈의 여왕"],
  ["mermaid", "인어공주"],
  ["genie", "알라딘과 요술 램프"],
  ["heracles", "영웅 헤라클레스"],
  ["perseus", "페르세우스와 메두사"],
  ["midas", "미다스 왕의 황금 손"],
  ["sunwukong", "손오공"],
  ["honggildong", "홍길동전"],
  ["sunmoon", "해와 달이 된 오누이"],
  ["arthur", "아서왕과 전설의 검"],
  ["bongi", "봉이 김선달"],
].map(([id, title]) => ({ id, title, path: `./story/audio/${id}.mp3` }));

const audioWarmups = new Map();

function scopedUrl(path) {
  return new URL(path, SITE_ROOT_URL).href;
}

function navigationCacheKey(request) {
  const url = new URL(request.url);
  const rootPath = SITE_ROOT_URL.pathname.endsWith("/")
    ? SITE_ROOT_URL.pathname
    : `${SITE_ROOT_URL.pathname}/`;
  const rootIndex = `${rootPath}index.html`;
  if (url.pathname === rootIndex) {
    url.pathname = rootPath;
  } else {
    for (const route of NAVIGATION_ROUTES) {
      const routePath = `${rootPath}${route}`;
      if (
        url.pathname === routePath
        || url.pathname === `${routePath}/`
        || url.pathname === `${routePath}/index.html`
      ) {
        url.pathname = `${routePath}/`;
        break;
      }
    }
  }
  url.search = "";
  url.hash = "";
  return new Request(url.href, { method: "GET", credentials: "same-origin" });
}

function canCache(response) {
  return Boolean(response && (response.status === 200 || response.type === "opaque"));
}

async function putIfCacheable(cache, request, response) {
  if (!canCache(response)) return response;
  try {
    await cache.put(request, response.clone());
  } catch (_) {
    // Quota, private-mode and eviction failures must not replace a successful
    // network response with an application error.
  }
  return response;
}

async function openCacheSafely(cacheName) {
  try {
    return await caches.open(cacheName);
  } catch (_) {
    return null;
  }
}

async function matchCacheSafely(cacheName, request) {
  const cache = await openCacheSafely(cacheName);
  if (!cache) return null;
  try {
    return await cache.match(request, { ignoreVary: true });
  } catch (_) {
    return null;
  }
}

// Card navigation must not show yesterday's UI even when a new ?v= URL is opened.
// Keep the canonical cached page as the bounded offline/failed-network fallback.
async function cardNavigation(request) {
  const key = navigationCacheKey(request);
  const cache = await openCacheSafely(STATIC_CACHE);
  try {
    const response = await fetchWithTimeout(new Request(request, { cache: "no-cache" }), 2500);
    if (response && response.ok) return cache ? putIfCacheable(cache, key, response) : response;
  } catch (_) {}
  return await matchCacheSafely(STATIC_CACHE, key) || Response.error();
}

async function staleWhileRevalidate(request, event) {
  const cache = await openCacheSafely(STATIC_CACHE);
  const key = request.mode === "navigate" ? navigationCacheKey(request) : request;
  let cached = null;
  if (cache) {
    try {
      cached = await cache.match(key, { ignoreVary: true });
    } catch (_) {
      cached = null;
    }
  }
  const refresh = fetch(request)
    .then((response) => cache ? putIfCacheable(cache, key, response) : response)
    .catch(() => null);
  if (cached) {
    if (event && typeof event.waitUntil === "function") event.waitUntil(refresh);
    return cached;
  }
  const network = await refresh;
  if (network) return network;
  if (request.mode === "navigate") {
    const fallback = cache
      ? await cache.match(scopedUrl("./game/index.html"), { ignoreVary: true }).catch(() => null)
      : null;
    return fallback || Response.error();
  }
  return Response.error();
}

async function cacheFirst(request, cacheName = RUNTIME_CACHE) {
  const cache = await openCacheSafely(cacheName);
  let cached = null;
  // 이번 배포의 정적 캐시가 오래 남는 미디어 캐시보다 먼저다. 설치 때 새로 받은 판이 이긴다.
  if (cacheName !== STATIC_CACHE) {
    cached = await matchCacheSafely(STATIC_CACHE, request);
  }
  if (!cached && cache) {
    try {
      cached = await cache.match(request, { ignoreVary: true });
    } catch (_) {
      cached = null;
    }
  }
  if (cached) return cached;
  const response = await fetch(request);
  return cache ? putIfCacheable(cache, request, response) : response;
}

function parseByteRange(header, totalLength) {
  if (typeof header !== "string" || !/^bytes=/i.test(header) || header.includes(",")) return null;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match || (!match[1] && !match[2]) || totalLength <= 0) return null;
  let start;
  let end;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, totalLength - suffixLength);
    end = totalLength - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : totalLength - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null;
    if (start >= totalLength || end < start) return null;
    end = Math.min(end, totalLength - 1);
  }
  return { start, end };
}

async function rangeResponse(fullResponse, rangeHeader) {
  const bytes = await fullResponse.arrayBuffer();
  const range = parseByteRange(rangeHeader, bytes.byteLength);
  if (!range) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${bytes.byteLength}`, "Accept-Ranges": "bytes" },
    });
  }
  const headers = new Headers(fullResponse.headers);
  headers.delete("Content-Encoding");
  headers.delete("Content-Length");
  headers.delete("Content-Range");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Length", String(range.end - range.start + 1));
  headers.set("Content-Range", `bytes ${range.start}-${range.end}/${bytes.byteLength}`);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/octet-stream");
  return new Response(bytes.slice(range.start, range.end + 1), {
    status: 206,
    statusText: "Partial Content",
    headers,
  });
}

async function cachedAudioResponse(url) {
  const request = new Request(url, { method: "GET", credentials: "same-origin" });
  // Praise MP3s are installed in the core static cache, including Safari ranges.
  // The static copy belongs to this deploy, so it wins over the long-lived audio cache.
  return await matchCacheSafely(STATIC_CACHE, request)
    || await matchCacheSafely(AUDIO_CACHE, request);
}

async function fetchWithTimeout(request, timeoutMs = AUDIO_FETCH_TIMEOUT_MS) {
  if (typeof AbortController === "undefined") return fetch(request);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(request, { signal: controller.signal });
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error("오디오 저장 시간이 초과됐어요");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fullAudioResponse(url) {
  const cached = await cachedAudioResponse(url);
  if (cached) return cached;
  const key = new Request(url, { method: "GET", credentials: "same-origin" });
  const response = await fetchWithTimeout(key);
  if (!response.ok || response.status !== 200) {
    throw new Error(`오디오 저장 실패 (${response.status})`);
  }
  const cache = await openCacheSafely(AUDIO_CACHE);
  if (cache) await putIfCacheable(cache, key, response);
  return response;
}

function warmFullAudio(url) {
  if (!audioWarmups.has(url)) {
    const warmup = fullAudioResponse(url).finally(() => audioWarmups.delete(url));
    audioWarmups.set(url, warmup);
  }
  return audioWarmups.get(url);
}

async function handleAudioRequest(request, event) {
  const rangeHeader = request.headers.get("Range");
  const cached = await cachedAudioResponse(request.url);
  if (cached) {
    if (rangeHeader && rangeHeader.includes(",")) return fetch(request);
    return rangeHeader ? rangeResponse(cached, rangeHeader) : cached;
  }
  if (rangeHeader) {
    // Safari gets its first network range immediately while a complete 200
    // response warms the offline cache in the background.
    event.waitUntil(warmFullAudio(request.url).catch(() => null));
    return fetch(request);
  }
  return fullAudioResponse(request.url);
}

async function handleGenericRangeRequest(request) {
  const rangeHeader = request.headers.get("Range");
  if (!rangeHeader || rangeHeader.includes(",")) return fetch(request);
  let cached = null;
  for (const cacheName of [STATIC_CACHE, RUNTIME_CACHE, AUDIO_CACHE]) {
    cached = await matchCacheSafely(cacheName, request);
    if (cached) break;
  }
  if (cached && cached.status === 200) {
    return rangeResponse(cached, rangeHeader);
  }
  // A network 206 is deliberately passed through and never cache.put().
  return fetch(request);
}

function reply(target, payload) {
  if (target && typeof target.postMessage === "function") target.postMessage(payload);
}

function safeAudioList(items) {
  if (!Array.isArray(items) || items.length === 0) return AUDIO_FILES.map((item) => ({
    ...item,
    url: scopedUrl(item.path),
  }));
  const safe = [];
  for (const item of items) {
    if (!item || typeof item.url !== "string") continue;
    const url = new URL(item.url, SITE_ROOT_URL);
    if (url.origin !== SITE_ROOT_URL.origin || !/\/story\/audio\/[^/]+\.mp3$/i.test(url.pathname)) continue;
    safe.push({ id: String(item.id || ""), title: String(item.title || ""), url: url.href });
  }
  return safe;
}

async function audioCacheCount(items) {
  const cache = await openCacheSafely(AUDIO_CACHE);
  if (!cache) return 0;
  const found = await Promise.all(items.map((item) => (
    cache.match(item.url, { ignoreVary: true }).catch(() => null)
  )));
  return found.filter(Boolean).length;
}

async function cacheAllAudio(target, requestId, requestedItems) {
  const items = safeAudioList(requestedItems);
  const total = items.length;
  let completed = 0;
  let saved = await audioCacheCount(items);
  const failures = [];
  reply(target, { type: "AUDIO_CACHE_START", requestId, completed, saved, total });
  for (const item of items) {
    try {
      await warmFullAudio(item.url);
      if (!(await cachedAudioResponse(item.url))) {
        throw new Error("기기 저장 공간이 부족해요");
      }
      saved = await audioCacheCount(items);
    } catch (error) {
      failures.push(item.id);
      reply(target, {
        type: "AUDIO_CACHE_ERROR",
        requestId,
        completed,
        saved,
        total,
        id: item.id,
        title: item.title,
        message: error && error.message ? error.message : "저장할 수 없어요",
      });
    }
    completed += 1;
    reply(target, {
      type: "AUDIO_CACHE_PROGRESS",
      requestId,
      completed,
      saved,
      total,
      id: item.id,
      title: item.title,
    });
  }
  reply(target, {
    type: "AUDIO_CACHE_COMPLETE",
    requestId,
    completed,
    saved,
    total,
    failed: failures.length,
    failures,
  });
}

function backgroundCacheName(path) {
  const shellLike = path.endsWith("/")
    || /\.(?:html?|js|css|json)(?:[?#]|$)/i.test(path);
  return shellLike ? STATIC_CACHE : RUNTIME_CACHE;
}

async function warmBackgroundAsset(path) {
  const cache = await openCacheSafely(backgroundCacheName(path));
  if (!cache) return false;
  const url = scopedUrl(path);
  try {
    if (await cache.match(url, { ignoreVary: true })) return true;
    const response = await fetch(url);
    if (!canCache(response)) return false;
    await putIfCacheable(cache, url, response);
    return Boolean(await cache.match(url, { ignoreVary: true }));
  } catch (_) {
    return false;
  }
}

async function runBounded(items, concurrency, worker) {
  let nextIndex = 0;
  let failures = 0;
  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), items.length) },
    async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex];
        nextIndex += 1;
        if (!(await worker(item))) failures += 1;
      }
    },
  );
  await Promise.all(workers);
  return failures;
}

let backgroundWarmupPromise = null;
let backgroundWarmupFinished = false;

async function readBackgroundWarmupState() {
  const cache = await openCacheSafely(RUNTIME_CACHE);
  if (!cache) return null;
  try {
    const response = await cache.match(scopedUrl(`./__pwa/${CACHE_VERSION}-warmup.json`));
    return response ? await response.json() : null;
  } catch (_) {
    return null;
  }
}

async function writeBackgroundWarmupState(state) {
  const cache = await openCacheSafely(RUNTIME_CACHE);
  if (!cache) return;
  const response = new Response(JSON.stringify(state), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
  await putIfCacheable(
    cache,
    scopedUrl(`./__pwa/${CACHE_VERSION}-warmup.json`),
    response,
  );
}

// 예전 배포 번호 캐시에 받아 둔 그림·소리를 오래 남는 캐시로 옮긴다. 옮긴 것은 다시 받지 않는다.
async function migrateLegacyMediaCaches(keys) {
  const legacy = keys.filter((key) => LEGACY_MEDIA_CACHE.test(key));
  for (const name of legacy) {
    const kind = LEGACY_MEDIA_CACHE.exec(name)[1];
    const target = await openCacheSafely(kind === "audio" ? AUDIO_CACHE : RUNTIME_CACHE);
    const source = await openCacheSafely(name);
    if (!target || !source) continue;
    let requests = [];
    try { requests = await source.keys(); } catch (_) { requests = []; }
    for (const request of requests) {
      if (new URL(request.url).pathname.includes("/__pwa/")) continue;
      try {
        if (await target.match(request, { ignoreVary: true })) continue;
        const response = await source.match(request, { ignoreVary: true });
        if (response && response.status === 200) await target.put(request, response);
      } catch (_) {
        // 저장 공간이 부족하면 옮기기를 멈춘다. 남은 것은 필요할 때 다시 받는다.
        break;
      }
    }
  }
  return legacy.length;
}

async function performBackgroundWarmup() {
  const previous = await readBackgroundWarmupState();
  if (previous && previous.complete) {
    backgroundWarmupFinished = true;
    return 0;
  }
  if (previous && Number(previous.retryAt) > Date.now()) {
    return Number(previous.failures) || 1;
  }
  const failures = await runBounded(
    BACKGROUND_ASSETS,
    BACKGROUND_WARM_CONCURRENCY,
    warmBackgroundAsset,
  );
  backgroundWarmupFinished = failures === 0;
  await writeBackgroundWarmupState({
    complete: backgroundWarmupFinished,
    failures,
    retryAt: failures ? Date.now() + BACKGROUND_RETRY_MS : 0,
  });
  return failures;
}

function warmBackgroundAssets() {
  if (backgroundWarmupFinished) return Promise.resolve(0);
  if (!backgroundWarmupPromise) {
    backgroundWarmupPromise = performBackgroundWarmup().finally(() => {
      backgroundWarmupPromise = null;
    });
  }
  return backgroundWarmupPromise;
}

if (typeof self !== "undefined" && typeof self.addEventListener === "function") {
  self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll([
        ...CORE_SHELL,
        ...CARD_ART_FILES,
        ...VFX_ART_FILES,
      ].map(scopedUrl));
      await self.skipWaiting();
    })());
  });
  self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
      const current = new Set([STATIC_CACHE, RUNTIME_CACHE, AUDIO_CACHE]);
      const keys = await caches.keys();
      await migrateLegacyMediaCaches(keys).catch(() => 0);
      await Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && !current.has(key))
        .map((key) => caches.delete(key)));
      // Retire removed games only; preserve family art and downloaded stories.
      const retiredRoots = ["./starkart/", "./picnic/", "./keycap/"].map(path => new URL(path, SITE_ROOT_URL));
      for (const name of [STATIC_CACHE, RUNTIME_CACHE]) {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        await Promise.all(requests.filter((request) => {
          const url = new URL(request.url);
          return retiredRoots.some(retiredRoot => url.origin === retiredRoot.origin &&
            (url.pathname === retiredRoot.pathname.slice(0, -1) ||
             url.pathname.startsWith(retiredRoot.pathname)));
        }).map((request) => cache.delete(request)));
      }
      await self.clients.claim();
    })());
    // Do not hold activation open for the optional 100MB+ game library.
    void warmBackgroundAssets();
  });
  self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;
    const url = new URL(request.url);
    if (url.origin !== SITE_ROOT_URL.origin) return;
    // 같은 도메인의 다른 사이트(점심 사이트 SIKPAN, 옛 주소 포함)는 이 워커 범위(/) 안에 있지만
    // 모험 상자 것이 아니다. 캐시하면 어제 메뉴를 먼저 보여 주므로 손대지 않는다.
    if (/^\/(?:sikpan|gasan-lunch)(?:\/|$)/.test(url.pathname)) return;
    if (!backgroundWarmupFinished) {
      event.waitUntil(warmBackgroundAssets().catch(() => null));
    }
    if (/\.mp3$/i.test(url.pathname)) {
      event.respondWith(handleAudioRequest(request, event));
      return;
    }
    if (request.headers.has("Range")) {
      event.respondWith(handleGenericRangeRequest(request));
      return;
    }
    if (request.mode === "navigate" && navigationCacheKey(request).url === scopedUrl("./cards/")) {
      event.respondWith(cardNavigation(request));
      return;
    }
    if (request.mode === "navigate" || /\.(?:html?|js|css|json)$/i.test(url.pathname)) {
      event.respondWith(staleWhileRevalidate(request, event));
      return;
    }
    if (/\/cards\/art\/(?:[^/]+\/)*[^/]+\.(?:webp|png)$/i.test(url.pathname)) {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
      return;
    }
    event.respondWith(cacheFirst(request));
  });
  self.addEventListener("message", (event) => {
    const data = event.data || {};
    const target = event.ports && event.ports[0] ? event.ports[0] : event.source;
    const items = safeAudioList(data.episodes);
    if (data.type === "CACHE_ALL_AUDIO") {
      event.waitUntil(cacheAllAudio(target, data.requestId || "", items));
    } else if (data.type === "CACHE_AUDIO") {
      event.waitUntil(Promise.allSettled(items.map((item) => warmFullAudio(item.url))));
    } else if (data.type === "GET_AUDIO_CACHE_STATUS") {
      event.waitUntil(audioCacheCount(items).then((saved) => reply(target, {
        type: "AUDIO_CACHE_STATUS",
        requestId: data.requestId || "",
        saved,
        total: items.length,
      })));
    } else if (data.type === "SKIP_WAITING") {
      event.waitUntil(self.skipWaiting());
    } else if (data.type === "CLAIM_CLIENTS") {
      event.waitUntil(self.clients.claim());
    }
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CACHE_VERSION,
    CACHE_PREFIX,
    STATIC_CACHE,
    RUNTIME_CACHE,
    AUDIO_CACHE,
    MEDIA_REVISION,
    LEGACY_MEDIA_CACHE,
    migrateLegacyMediaCaches,
    CORE_SHELL,
    OPTIONAL_SHELL,
    APP_SHELL,
    SANGUO_RUNTIME_ASSETS,
    BACKGROUND_ASSETS,
    BACKGROUND_WARM_CONCURRENCY,
    BACKGROUND_RETRY_MS,
    AUDIO_FETCH_TIMEOUT_MS,
    NAVIGATION_ROUTES,
    CARD_ART_FILES,
    VFX_ART_FILES,
    AUDIO_FILES,
    navigationCacheKey,
    canCache,
    putIfCacheable,
    staleWhileRevalidate,
    cardNavigation,
    cacheFirst,
    parseByteRange,
    rangeResponse,
    handleGenericRangeRequest,
    handleAudioRequest,
    safeAudioList,
    runBounded,
    backgroundCacheName,
    matchCacheSafely,
    fetchWithTimeout,
  };
}
