import fs from 'fs';
import Mustache from 'mustache';

const restaurantsApiRoot = process.env.restaurants_api;
const days = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

let html;

function loadHtml() {
  if (!html) {
    console.log('loading index.html...');
    html = fs.readFileSync('static/index.html', 'utf-8');
    console.log('loaded');
  }

  return html;
}

const getRestaurants = async () => {
  const resp = await fetch(restaurantsApiRoot);
  return await resp.json();
};

export const handler = async (event, context) => {
  const template = loadHtml();
  const restaurants = await getRestaurants();
  const dayOfWeek = days[new Date().getDay()];
  const html = Mustache.render(template, { dayOfWeek, restaurants });
  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
    },
    body: html,
  };

  return response;
};

// The "GetIndex" function now depends on packages in the "node_modules" folder. And we can't just take the whole "node_modules" folder because it includes lots of packages that we won't even need, and that will blow up the size of our function.

// Fortunately, CDK has a "NodejsFunction" construct that can deal with this.

// Unfortunately, the "NodejsFunction" requires Docker, so we have to install that first... And it also doesn't bundle additional assets like the "static/index.html" file. So that's another challenge we have to solve.

// Also, it uses esbuild to bundle the function, which can create several problems and tough trade-offs involving source maps:

// Without a source map, the stack trace from the function would be useless.
// With a source map, the size of the bundled function can blow up significantly and significantly impact the cold start time of the function.
// If the size of the source map is significant, then it can add a noticeable delay to the invocation when the function errors. Because the runtime has to load the source map file at that point to produce a meaningful stack trace. I have seen an erroneous invocation (for a function with lots of dependencies) take several seconds to respond, and that's unacceptable from a user experience POV.
// So despite its drawbacks, I would recommend not including a source map. Which is also the default behaviour of the "NodejsFunction" construct.
