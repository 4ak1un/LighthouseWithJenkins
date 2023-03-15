const fs = require('fs')
const puppeteer = require('puppeteer')
const lighthouse = require('lighthouse/lighthouse-core/fraggle-rock/api.js')

const waitTillHTMLRendered = async (page, timeout = 30000) => {
  const checkDurationMsecs = 1000;
  const maxChecks = timeout / checkDurationMsecs;
  let lastHTMLSize = 0;
  let checkCounts = 1;
  let countStableSizeIterations = 0;
  const minStableSizeIterations = 3;

  while(checkCounts++ <= maxChecks){
    let html = await page.content();
    let currentHTMLSize = html.length; 

    let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);

    //console.log('last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, " body html size: ", bodyHTMLSize);

    if(lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize) 
      countStableSizeIterations++;
    else 
      countStableSizeIterations = 0; //reset the counter

    if(countStableSizeIterations >= minStableSizeIterations) {
      console.log("Fully Rendered Page: " + page.url());
      break;
    }

    lastHTMLSize = currentHTMLSize;
    await page.waitForTimeout(checkDurationMsecs);
  }  
};

async function captureReport() {
	// const browser = await puppeteer.launch({args: ['--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--disable-gpu', '--disable-gpu-sandbox', '--display', '--ignore-certificate-errors', '--disable-storage-reset=true']});
	const browser = await puppeteer.launch({"headless": false, args: ['--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--ignore-certificate-errors', '--disable-storage-reset=true']});
	const page = await browser.newPage();
	const baseURL = "http://localhost/";
	
	await page.setViewport({"width":1920,"height":1080});
	await page.setDefaultTimeout(10000);
	
	const navigationPromise = page.waitForNavigation({timeout: 30000, waitUntil: ['domcontentloaded']});
	await page.goto(baseURL);
    await navigationPromise;
		
	const flow = await lighthouse.startFlow(page, {
		name: 'shopizer',
		configContext: {
		  settingsOverrides: {
			throttling: {
			  rttMs: 40,
			  throughputKbps: 10240,
			  cpuSlowdownMultiplier: 1,
			  requestLatencyMs: 0,
			  downloadThroughputKbps: 0,
			  uploadThroughputKbps: 0
			},
			throttlingMethod: "simulate",
			screenEmulation: {
			  mobile: false,
			  width: 1920,
			  height: 1080,
			  deviceScaleFactor: 1,
			  disabled: false,
			},
			formFactor: "desktop",
			onlyCategories: ['performance'],
		  },
		},
	});
	
	//================================SELECTORS================================
    const tablesTab         = `.main-menu>nav>ul>li>a[href="/category/tables"]`;
	const tablesTabCheck    = `span[to="/category/tables"]`
    const oliveTable        = `.product-wrap>.product-img>a[href="/product/olive-table"]`
    const oliveTableCheck   = `span[to="/product/olive-table"]`
    const addToCart         = `.pro-details-cart>button`
    const addToCartCheck    = `.css-h2fnfe`
    const cartIcon          = `.same-style.cart-wrap.d-none.d-lg-block>button>i`
    const viewCart          = `a.default-btn[href="/cart"]`
    const proceedToCheckout = `.grand-totall-title+a[href="/checkout"]`
    const checkoutCheck     = `span[to="/checkout"]`

	//================================NAVIGATE================================
    await flow.navigate(baseURL, {
		stepName: 'Open the application'
		});
  	console.log('Application is opened');
 	
	//================================PAGE_ACTIONS================================
	await flow.startTimespan({ stepName: 'Navigate to "Tables" tab' });
		await page.click(tablesTab);
        await waitTillHTMLRendered(page);
		await page.waitForSelector(tablesTabCheck);
    await flow.endTimespan();
    console.log('Navigate to "Tables" is completed');

	await page.waitForSelector(oliveTable);
	await flow.startTimespan({ stepName: 'Open a table product cart' });
		await page.click(oliveTable);
		await waitTillHTMLRendered(page);
		await page.waitForSelector(oliveTableCheck);
	await flow.endTimespan();
	console.log('Click on a table is completed');

    await page.waitForSelector(addToCart);
	await flow.startTimespan({ stepName: 'Add table to Cart' });
		await page.click(addToCart);
		await waitTillHTMLRendered(page);
		await page.waitForSelector(addToCartCheck);
	await flow.endTimespan();
	console.log('click "Add to Cart" button is completed');

    await page.waitForSelector(cartIcon);
	await flow.startTimespan({ stepName: 'Open Cart' });
		await page.click(cartIcon);
		await waitTillHTMLRendered(page);
		await page.waitForSelector(viewCart);
        await page.click(viewCart);
	await flow.endTimespan();
	console.log('Open Cart button is completed');

    await page.waitForSelector(proceedToCheckout);
	await flow.startTimespan({ stepName: 'Click "Proceed to checkout"' });
		await page.click(proceedToCheckout);
		await waitTillHTMLRendered(page);
		await page.waitForSelector(checkoutCheck);
	await flow.endTimespan();
	console.log('Click "Proceed to checkout" is completed');

	//================================REPORTING================================
	const reportPath = __dirname + '/user-flow.report.html';
	//const reportPathJson = __dirname + '/user-flow.report.json';

	const report = await flow.generateReport();
	//const reportJson = JSON.stringify(flow.getFlowResult()).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
	
	fs.writeFileSync(reportPath, report);
	//fs.writeFileSync(reportPathJson, reportJson);
	console.log("Report >> "+reportPath);
    await browser.close();
}
captureReport();