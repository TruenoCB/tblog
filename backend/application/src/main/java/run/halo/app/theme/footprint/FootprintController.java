package run.halo.app.theme.footprint;

import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.security.Principal;
import java.time.Instant;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.ServerResponse;
import org.springdoc.webflux.core.fn.SpringdocRouteBuilder;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.server.ServerRequest;
import run.halo.app.core.extension.endpoint.CustomEndpoint;
import run.halo.app.extension.GroupVersion;

@RestController
@RequestMapping("/api/footprints")
public class FootprintController implements CustomEndpoint {

    private final FootprintRepository repository;

    public FootprintController(FootprintRepository repository) {
        this.repository = repository;
    }

    @Override
    public RouterFunction<ServerResponse> endpoint() {
        return SpringdocRouteBuilder.route()
            .GET("footprints/map-data", this::getMapDataRoute, builder -> builder.operationId("getMapData"))
            .build();
    }

    @Override
    public GroupVersion groupVersion() {
        return GroupVersion.parseAPIVersion("api.content.halo.run/v1alpha1");
    }

    private Mono<ServerResponse> getMapDataRoute(ServerRequest request) {
        return repository.findAll().collectList().flatMap(footprints -> {
            List<Map<String, Object>> locations = new ArrayList<>();
            for (Footprint fp : footprints) {
                Map<String, Object> loc = new HashMap<>();
                loc.put("name", fp.getTitle());
                loc.put("coordinates", new Double[]{fp.getLng(), fp.getLat()});
                String desc = fp.getExcerpt();
                if (desc != null && desc.startsWith("Post.Excerpt")) {
                    int start = desc.indexOf("raw=");
                    if (start != -1) {
                        int end = desc.lastIndexOf(")");
                        if (end != -1 && end > start + 4) {
                            desc = desc.substring(start + 4, end);
                        }
                    }
                }
                loc.put("description", desc);
                loc.put("date", fp.getDateStr());
                loc.put("url", fp.getPostUrl());
                loc.put("urlLabel", "查看文章");
                
                if (fp.getThumbnail() != null && !fp.getThumbnail().isEmpty()) {
                    loc.put("photos", new String[]{fp.getThumbnail()});
                } else {
                    loc.put("photos", new String[]{});
                }
                
                loc.put("categories", fp.getTripName() != null && !fp.getTripName().isEmpty() ? fp.getTripName() : "未分类");
                locations.add(loc);
            }
            Map<String, Object> result = new HashMap<>();
            result.put("locations", locations);
            return ServerResponse.ok().contentType(MediaType.APPLICATION_JSON).bodyValue(result);
        });
    }

    @GetMapping("/map-data")
    public Mono<Map<String, Object>> mapData() {
        return repository.findAll().collectList().map(footprints -> {
            List<Map<String, Object>> locations = new ArrayList<>();
            for (Footprint fp : footprints) {
                Map<String, Object> loc = new HashMap<>();
                loc.put("name", fp.getTitle());
                loc.put("coordinates", new Double[]{fp.getLng(), fp.getLat()});
                loc.put("description", fp.getExcerpt());
                loc.put("date", fp.getDateStr());
                loc.put("url", fp.getPostUrl());
                loc.put("urlLabel", "查看文章");
                
                if (fp.getThumbnail() != null && !fp.getThumbnail().isEmpty()) {
                    loc.put("photos", new String[]{fp.getThumbnail()});
                } else {
                    loc.put("photos", new String[]{});
                }
                
                loc.put("categories", fp.getTripName() != null && !fp.getTripName().isEmpty() ? fp.getTripName() : "未分类");
                locations.add(loc);
            }
            Map<String, Object> result = new HashMap<>();
            result.put("locations", locations);
            return result;
        });
    }

    @GetMapping
    public Flux<Footprint> list() {
        return repository.findAll();
    }

    @PostMapping
    public Mono<Footprint> create(@RequestBody Footprint footprint, Mono<Principal> principalMono) {
        return principalMono
            .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login first")))
            .flatMap(principal -> {
                footprint.setCreateTime(Instant.now());
                return repository.save(footprint);
            });
    }

    @DeleteMapping("/{id}")
    public Mono<Void> delete(@PathVariable Long id, Mono<Principal> principalMono) {
        return principalMono
            .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login first")))
            .flatMap(principal -> repository.deleteById(id));
    }
}
