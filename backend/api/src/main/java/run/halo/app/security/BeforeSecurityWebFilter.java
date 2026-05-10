package run.halo.app.security;

import org.pf4j.ExtensionPoint;
import org.springframework.web.server.WebFilter;

/**
 * Before security web filter.
 *
 * @author johnniang
 */
public interface BeforeSecurityWebFilter extends WebFilter, ExtensionPoint {

}
