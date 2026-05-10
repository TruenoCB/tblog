package run.halo.app.theme.footprint;

import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FootprintRepository extends R2dbcRepository<Footprint, Long> {
}
