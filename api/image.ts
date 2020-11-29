import { NowRequest, NowResponse } from '@vercel/node'
import { launch, Page } from 'puppeteer-core'
import chrome from 'chrome-aws-lambda'

let _page: Page | null

export default async function (req: NowRequest, res: NowResponse) {
  try {
    const type = String(req.query.type) === 'jpeg' ? 'jpeg' : ('png' as const)
    const url = String(req.query.url)
    const waitUntil = 'load'
    const result = await renderImage({
      url,
      type,
      width: 375,
      height: 2000,
      deviceScaleFactor: 1,
      waitUntil,
    })
    res.setHeader('Content-Type', 'image/' + type)
    res.setHeader(
      'Cache-Control',
      `public, immutable, no-transform, s-maxage=31536000, max-age=31536000`
    )
    res.send(result)
  } catch (error) {
    res.send('Error')
    console.error(error)
  }
}

interface ScreenshotOptions {
  url: string
  width: number
  height: number
  deviceScaleFactor: number
  type: 'jpeg' | 'png'
  waitUntil: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2'
}

async function renderImage({
  url,
  type,
  width,
  height,
  deviceScaleFactor,
  waitUntil,
}: ScreenshotOptions) {
  let page = await getPage()
  await page.setViewport({ width, height, deviceScaleFactor })
  await page.goto(url, { waitUntil })
  // See: https://github.com/puppeteer/puppeteer/issues/511
  await page.evaluate(async () => {
    const style = document.createElement('style')
    style.textContent = `
      *,
      *::after,
      *::before {
        transition-delay: 0s !important;
        transition-duration: 0s !important;
        animation-delay: -0.0001s !important;
        animation-duration: 0s !important;
        animation-play-state: paused !important;
        caret-color: transparent !important;
        color-adjust: exact !important;
      }
    `
    document.head.appendChild(style)
    document.documentElement.dataset.screenshotMode = '1'
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
  })
  const file = await page.screenshot({ type })
  return file
}

async function getPage() {
  let page = _page
  if (!page) {
    await chrome.font(
      'https://cdn.jsdelivr.net/gh/googlei18n/noto-emoji@master/fonts/NotoColorEmoji.ttf'
    )
    await chrome.font(
      'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@master/hinted/ttf/NotoSansThai/NotoSansThai-Regular.ttf'
    )
    const browser = await launch({
      args: chrome.args,
      executablePath:
        (await chrome.executablePath) || '/usr/bin/chromium-browser',
      headless: true,
    })
    page = await browser.newPage()
    _page = page
  }
  return page
}
