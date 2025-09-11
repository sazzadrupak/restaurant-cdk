import middy from '@middy/core';
import ssm from '@middy/ssm';

const { service_name, ssm_stage_name } = process.env;

export const wrap = (handler) => {
  return middy(handler).use(
    ssm({
      cache: true,
      cacheExpiry: 1 * 60 * 1000, // 1 mins
      setToContext: true,
      fetchData: {
        serviceQuotas: `/${service_name}/${ssm_stage_name}/serviceQuotas`,
        secretString: `/${service_name}/${ssm_stage_name}/search-restaurants/secretString`,
      },
    })
  );
};
