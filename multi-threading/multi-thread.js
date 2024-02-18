const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

let min = 2,
  max = 10_000_000,
  primes = [];

// 아리토스테네스의 체 소수구하기
function generatePrimes(start, range) {
  let isPrime = true;
  const end = start + range;
  for (let i = start; i < end; i++) {
    for (let j = min; j < Math.sqrt(end); j++) {
      if (i !== j && i % j === 0) {
        isPrime = false;
        break;
      }
    }

    if (isPrime) {
      primes.push(i);
    }
    isPrime = true;
  }
}

if (isMainThread) {
  const threadCount = 8;
  const threads = new Set();
  const range = Math.ceil((max - min) / threadCount); // 10_000_000 max를 8개의 쓰레드에 분배를 해서 처리하기 위해서

  let start = min;
  console.time('prime2');

  // 우리가 워커가 일을 할수있게 분배하고 직접 짜야 한다. 여간 복잡한게 아니다..
  for (let i = 0; i < threadCount - 1; i++) {
    const wStart = start;
    threads.add(new Worker(__filename, { workerData: { start: wStart, range: range } }));
    start += range;
  }
  // 7개만 for돌고 마지막 워커는 특별해서 따로 지정
  threads.add(new Worker(__filename, { workerData: { start: start, range: range + ((max - min + 1) % threadCount) } }));

  // 워커들 이벤트 등록
  for (let worker of threads) {
    worker.on('error', (err) => {
      throw err;
    });

    worker.on('exit', () => {
      threads.delete(worker);

      if (threads.size === 0) {
        console.timeEnd('prime2');
        console.log(primes.length);
      }
    });

    // 워커들이 일한 결과를 메시지 받아서 정리해주는 동작도 직접 구현
    worker.on('message', (msg) => {
      primes = primes.concat(msg);
    });
  }
} else {
  // 워커들 일 등록
  generatePrimes(workerData.start, workerData.range);
  parentPort.postMessage(primes);
}
