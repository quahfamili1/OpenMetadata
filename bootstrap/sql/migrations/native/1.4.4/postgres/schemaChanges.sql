ALTER TABLE user_entity ADD UNIQUE (name);

-- Adding a new column 'taskAssigneesIds' to improve query performance by avoiding the use of JSON_EXTRACT in queries
-- This column is generated to store the 'id' values extracted from the 'taskAssignees' JSON array, which helps in optimizing search and filtering operations.
ALTER TABLE thread_entity
ADD COLUMN taskAssigneesIds TEXT;
UPDATE thread_entity
SET taskAssigneesIds = (
    SELECT jsonb_agg(elem->>'id')
    FROM jsonb_array_elements(taskAssignees) AS elem
);
CREATE INDEX taskAssigneesIds_index ON thread_entity(taskAssigneesIds);

-- Creating an index on (type, resolved, updatedAt) to optimize query performance for filtering by these columns for activity feed.-FeedDao.List
CREATE INDEX thread_type_resolved_updatedAt_index ON thread_entity (type, resolved, updatedAt);

-- Creating an index on (createdAt) to improve performance for queries that sort or filter by creation date in activity feed.-FeedDao.List
CREATE INDEX created_at_index ON thread_entity (createdAt);