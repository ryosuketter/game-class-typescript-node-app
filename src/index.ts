// ユーザーにメッセージを表示するための関数 p63
const printLine = (text: string, breakLine: boolean = true) => {
  process.stdout.write(text + (breakLine ? "\n" : ""));
};

// processオブジェクトはNode.js実行環境のグローバル変数のひとつ
// process.stdin.once データを一度だけ受け取るメソッド p63
// 　標準入力の'data'イベントを捕捉すると、キーボードで文字が入力完了次第、それを返すやつらしい
// 　ターミナル上で「Enterキー」が押されたタイミングまでに入力された文字列データを読み取る
// 　process.stdin.onceは、一回限りでｲﾍﾞﾝﾄが破棄されて､ｲﾍﾞﾝﾄが何度も訪れることを恐れる必要はないらしい
// p93
// async ユーザーからの入力を待つ処理
const readLine = async () => {
  const input: string = await new Promise((resolve) =>
    process.stdin.once("data", (data) => resolve(data.toString()))
  );
  return input.trim(); // trim() メソッドは、文字列の両端の空白を削除
};

// ユーザーに質問を投げかけ 関数 printLine()
// ユーザーに何か入力（　関数 readLine()　）してもらう関数が promptInput
const promptInput = async (text: string) => {
  printLine(`\n${text}\n`, false);
  return readLine();
};

// promptSelectの作成 p98
// 引数 T を extends stringしないと、
//   型アサーション（(await readLine()) as T）が包含関係にないため型エラーが起きる p106
// 各ゲームに依存した内容をハードコードせずジェネリクスを用いて汎用化させている p100
// T はジェネリクスで この時点ではどんな型か確定していない p106
// 確定していないと、(await readLine()) as T で包含関係にないからエラーになるの対策 p106
const promptSelect = async <T extends string>(
  text: string,
  values: readonly T[]
): Promise<T> => {
  // アプリケーションで与えた選択肢を出力 p98
  printLine(`\n${text}\n`, false);
  values.forEach((value) => printLine(`- ${value}`));
  printLine(`>`, false);

  // バリデーション
  //   ユーザーからの入力を受け付け
  const input = (await readLine()) as T; // as T　が無いと promptSelect の戻り値 Promise<T>と矛盾する p105
  //   選択肢に合致するものがなければ再帰的に関数を呼び出して再入力を促す p99
  if (values.includes(input)) {
    return input;
  } else {
    return promptSelect<T>(text, values);
  }
};

abstract class Game {
  abstract setting(): Promise<void>;
  abstract play(): Promise<void>;
  abstract end(): void;
}

// as const（型アサーション）をつけて Literal Type Wideningを抑制の働きを抑制する(p112)
// shimizuArray[number] に タプル型（固定長配列）がもつ全ての型をユニオン型にして（p113）typeof をつけて型を取得する(p109)
const gameTitles = ["hit and blow", "janken battle"] as const;
type GameTitle = typeof gameTitles[number];

// 課題: GameStoreのキーが2重管理 p129
// 対策: インデックスシグネチャによるキーの汎化 p133
// 対策: 抽象クラスの型としての利用 p137
// 目的: HitAndBlow | Jankenという型が2箇所で使われるのを1か所にしたいから p138
// 目的: 新たなゲームを実装するとき、どんなメソッドを持ったクラスを作れば良いかわからないの解決 p138
type GameStore = {
  // インスタンスが最低限持ってほしいメソッドは Game（抽象クラス）に定義されているので置き換えた p137
  // こうすることで、implement Game を付与したクラスで表現されたクラスで実装すれば
  [key in GameTitle]: Game;
};

// as const（型アサーション）をつけて Literal Type Wideningを抑制の働きを抑制する(p112)
// shimizuArray[number] に タプル型（固定長配列）がもつ全ての型をユニオン型にして（p113）typeof をつけて型を取得する(p109)
const nextActions = ["play again", "game change", "exit"] as const;
type NextAction = typeof nextActions[number];

// ゲームの処理を汎用的にするためのクラス p115
class GameProcedure {
  // プロパティ：現在選択されているゲームのタイトル p117
  private currentGameTitle: GameTitle | "" = "";
  // プロパティ：現在選択されているゲームのインスタンス p117
  private currentGame: Game | null = null;

  // 選択肢となるゲームを抱える場所の定義 p122
  // 型定義：ゲーム名をキー、ゲームのクラスをインスタンスをバリューに持つ p122
  // ゲームのクラスとは疎結合になるようにコンストラクタで受けてるらしい p122
  // constructorのブロック内には何もないけど、TypeScriptの正しいシンタックスです p123
  // GameProcedure がインスタンス化されるときに gameStore プロパティがセットされます p122
  constructor(private readonly gameStore: GameStore) {}

  // メソッド：ゲームの選択などの初期設定 p117
  public async start() {
    await this.select();
    await this.play();
  }

  // 処理の手順 p125
  // 1. ユーザーへゲームの選択（ゲームタイトルの入力）を促す
  // 2. 入力された値を currentGameTitle にセットする
  // 3. 入力された値に対応するゲームのインスタンスを currentGame にセット
  private async select() {
    this.currentGameTitle = await promptSelect<GameTitle>(
      "ゲームのタイトルを入力してください。",
      gameTitles
    );
    this.currentGame = this.gameStore[this.currentGameTitle];
  }

  // メソッド：「currentGame」の実行 p117
  private async play() {
    // currentGame は null の可能性があり、nullのままplayメソッドが実行される想定はないのでガード p126
    if (!this.currentGame) throw new Error("ゲームが選択されていません");
    printLine(`===\n${this.currentGameTitle}を開始します。\n===`);
    // Promise を使用した処理を呼び出すときは awaitをつける p93
    // awaitを使用するということはそれを呼び出すコードに async をつけるのde playメソッドに asyncが付く p93
    await this.currentGame.setting();
    await this.currentGame.play();
    this.currentGame.end();

    const action = await promptSelect<NextAction>(
      "ゲームを続けますか？",
      nextActions
    );
    if (action === "play again") {
      await this.play();
    } else if (action === "game change") {
      await this.select();
      await this.play();
    } else if (action === "exit") {
      this.end();
    } else {
      // 変数 action は "play again" | "game change" | "exit" 型
      // なので else には到達しない。なので never型を定義して actionの種類を増やしたら
      // 条件分岐の追加を忘れたことに気づけるようにコンパイルエラーを出させる仕組み p120
      const neverValue: never = action;
      throw new Error(`${neverValue} is an invalid action.`);
    }
  }

  // メソッド：アプリケーションの終了 p117
  private end() {
    printLine("ゲームを終了しました");
    process.exit();
  }
}

// プロパティ answerSource: 答えの選択肢 p65
// プロパティ answer: ユーザーの回答 p65
// プロパティ tryCount: 試行回数 p65
interface HitAndBlowInterface {
  answerSource: string[];
  answer: string[];
  tryCount: number;
}

// as const（型アサーション）をつけて Literal Type Wideningを抑制の働きを抑制する(p112)
// shimizuArray[number] に タプル型（固定長配列）がもつ全ての型をユニオン型にして（p113）typeof をつけて型を取得する(p109)
// ユーザーによるモード選択機能 p92
const modes = ["normal", "hard"] as const;
type Mode = typeof modes[number];

class HitAndBlow implements Game {
  // スタティックなクラスフィールド宣言(Class Fields)
  // readonly修飾子 p76
  private readonly answerSource = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
  ];
  // スタティックなクラスフィールド宣言(Class Fields)
  // private で 内部だけ編集可能にする p74
  private answer: string[] = [];
  // private で 内部だけ編集可能にする p74
  private tryCount = 0;
  // private で 内部だけ編集可能にする p74
  // modeというプロパティが宣言されているにもかかわらず constructor内で初期化されない p92
  // されないと(型)エラーが出るので mode プロパティは Mode型であることをしめさないといけない p92
  // エラー内容：プロパティ 'mode' に初期化子がなく、コンストラクターで明確に割り当てられていません。ts(2564)
  // なので normal か hard を代入している p92
  private mode: Mode = "normal";

  async setting() {
    this.mode = await promptSelect("モードを入力してください", modes);
    const answerLength = this.getAnswerLength();

    // ゲームの答えになる 数値を配列として定義 例 ['1','3','4'] p70
    while (this.answer.length < answerLength) {
      // 変数 randNum には0〜9の数値が入る
      const randNum = Math.floor(Math.random() * this.answerSource.length);
      const selectedItem = this.answerSource[randNum];
      // answer配列が所定の数埋まるまで繰り返す
      if (!this.answer.includes(selectedItem)) this.answer.push(selectedItem);
    }
  }

  // p71 コードの中身は理解できた
  async play() {
    console.log("answer", this.answer);
    const answerLength = this.getAnswerLength();

    // promptInput は 内部的に Promiseを使った非同期処理 p72
    // なので使用する側で async, awaitを書く必要がある p72
    // ユーザーが入力したn個の文字 例えば ['5','9','1']の値が入ってきます p79
    const inputArr = (
      await promptInput(
        `「,」区切りで${answerLength}つの数字を入力してください`
      )
    ).split(",");

    if (!this.validate(inputArr)) {
      printLine(`無効な入力です\n現在の試行回数: ${this.tryCount}回目`);
      await this.play();
      return;
    }

    // p79
    const result = this.check(inputArr);

    if (result.hit !== this.answer.length) {
      // 不正解なら続ける
      printLine(`---\n Hit: ${result.hit} \n Blow: ${result.blow} \n---`);
      this.tryCount += 1;
      printLine(`これが試行回数: ${this.tryCount}回目でした`);
      await this.play();
    } else {
      // 正解だったら終了
      this.tryCount += 1;
    }
  }

  // p78
  end() {
    printLine(`正解です！\n試行回数: ${this.tryCount}回`);
    this.reset();
  }

  // p72
  // checkメソッドはplayメソッド内からのみ利用可能なので privateに
  private check(input: string[]) {
    let hitCount = 0;
    let blowCount = 0;

    input.forEach((val, index) => {
      if (val === this.answer[index]) {
        hitCount += 1;
      } else if (this.answer.includes(val)) {
        blowCount += 1;
      }
    });

    return {
      hit: hitCount,
      blow: blowCount,
    };
  }

  // p120
  private reset() {
    this.answer = [];
    this.tryCount = 0;
  }

  // クラス内部でしか使われていないので private 修飾子 p79
  private validate(inputArr: string[]) {
    const isLengthValid = inputArr.length === this.answer.length;
    // それぞれの文字列が answerSource に含まれている
    const isAllAnswerSourceOption = inputArr.every((val) =>
      this.answerSource.includes(val)
    );
    // 重複がないか確認
    const isAllDifferentValues = inputArr.every(
      (val, i) => inputArr.indexOf(val) === i
    );
    return isLengthValid && isAllAnswerSourceOption && isAllDifferentValues;
  }

  // never型によるエラーの検知 p83
  private getAnswerLength() {
    switch (this.mode) {
      case "normal":
        return 3;
      case "hard":
        return 4;
      default:
        const neverValue: never = this.mode;
        throw new Error(`${neverValue}は無効なモードです」`);
    }
  }
}

// タプル型とas const p112
// p113
const jankenOptions = ["rock", "paper", "scissors"] as const;
type JankenOption = typeof jankenOptions[number];

class Janken implements Game {
  private rounds = 0;
  private currentRound = 1;
  private result = {
    win: 0,
    lose: 0,
    draw: 0,
  };

  async setting() {
    const rounds = Number(await promptInput("何本勝負にしますか？"));
    if (Number.isInteger(rounds) && 0 < rounds) {
      this.rounds = rounds;
    } else {
      await this.setting();
    }
  }

  async play() {
    const userSelected = await promptSelect(
      `【${this.currentRound}回戦】選択肢を入力してください。`,
      jankenOptions
    );
    const randomSelected = jankenOptions[Math.floor(Math.random() * 3)];
    const result = Janken.judge(userSelected, randomSelected);
    let resultText: string;

    switch (result) {
      case "win":
        this.result.win += 1;
        resultText = "勝ち";
        break;
      case "lose":
        this.result.lose += 1;
        resultText = "負け";
        break;
      case "draw":
        this.result.draw += 1;
        resultText = "あいこ";
        break;
    }
    printLine(
      `---\nあなた: ${userSelected}\n相手${randomSelected}\n${resultText}\n---`
    );

    if (this.currentRound < this.rounds) {
      this.currentRound += 1;
      await this.play();
    }
  }

  end() {
    printLine(
      `\n${this.result.win}勝${this.result.lose}敗${this.result.draw}引き分けでした。`
    );
    this.reset();
  }

  private reset() {
    this.rounds = 0;
    this.currentRound = 1;
    this.result = {
      win: 0,
      lose: 0,
      draw: 0,
    };
  }

  static judge(userSelected: JankenOption, randomSelected: JankenOption) {
    if (userSelected === "rock") {
      if (randomSelected === "rock") return "draw";
      if (randomSelected === "paper") return "lose";
      return "win";
    } else if (userSelected === "paper") {
      if (randomSelected === "rock") return "win";
      if (randomSelected === "paper") return "draw";
      return "lose";
    } else {
      if (randomSelected === "rock") return "lose";
      if (randomSelected === "paper") return "win";
      return "draw";
    }
  }
}

// ここに入る値は GameStore型になる p124
(async () => {
  new GameProcedure({
    "hit and blow": new HitAndBlow(),
    "janken battle": new Janken(),
  }).start();
})();
